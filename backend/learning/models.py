import secrets
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from .storage import PrivateMediaStorage, course_asset_path


class Course(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = 'public', 'Publiczny'
        PRIVATE = 'private', 'Prywatny'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Oczekuje'
        APPROVED = 'approved', 'Zatwierdzony'
        REJECTED = 'rejected', 'Odrzucony'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_courses',
    )
    # Legacy archive only: content and availability come from CourseVersion.
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    visibility = models.CharField(max_length=10, choices=Visibility.choices)
    approval_status = models.CharField(
        max_length=10,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    is_active = models.BooleanField(default=True)
    invite_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    current_published_version = models.ForeignKey(
        'CourseVersion', on_delete=models.PROTECT, null=True, blank=True, related_name='current_for_courses',
    )

    _loaded_visibility = None

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._remember_guarded_values()
        return instance

    def _remember_guarded_values(self):
        self._loaded_visibility = self.__dict__.get('visibility')

    def save(self, *args, **kwargs):
        if self.pk is not None and self._loaded_visibility is not None:
            if self.visibility != self._loaded_visibility:
                raise ValidationError({'visibility': 'Widoczność kursu nie może zostać zmieniona.'})
        if self.visibility == self.Visibility.PRIVATE and not self.invite_token:
            self.invite_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)
        self._remember_guarded_values()


class CourseTask(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(hours__gt=0), name='course_task_hours_positive'),
        ]

    def __str__(self):
        return self.title


class Instance(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Aktywna'
        CLOSED = 'closed', 'Zamknięta'

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='instances')
    course_version = models.ForeignKey(
        'CourseVersion', on_delete=models.PROTECT, related_name='instances',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='course_instances',
    )
    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='mentored_instances',
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['student'],
                condition=Q(status='active'),
                name='one_active_instance_per_student',
            ),
        ]

    def __str__(self):
        return f'{self.course} / {self.student}'


class InstancePeriod(models.Model):
    instance = models.ForeignKey(Instance, on_delete=models.CASCADE, related_name='periods')
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['started_at', 'id']


class InstanceTask(models.Model):
    class Status(models.TextChoices):
        TODO = 'todo', 'Do zrobienia'
        IN_PROGRESS = 'in_progress', 'W trakcie'
        DONE = 'done', 'Zrobione'

    instance = models.ForeignKey(Instance, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.TODO)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(hours__gt=0), name='instance_task_hours_positive'),
        ]

    def __str__(self):
        return self.title


class Classification(models.Model):
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ['name', 'id']

    def __str__(self):
        return self.name


class CourseScope(Classification):
    pass


class CourseSubject(Classification):
    pass


class CourseVersion(models.Model):
    class State(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        REJECTED = 'rejected', 'Rejected'
        PUBLISHED = 'published', 'Published'

    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='versions')
    number = models.PositiveIntegerField()
    state = models.CharField(max_length=10, choices=State.choices, default=State.DRAFT)
    title = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    scope = models.ForeignKey(CourseScope, on_delete=models.PROTECT, null=True, blank=True)
    subject = models.ForeignKey(CourseSubject, on_delete=models.PROTECT, null=True, blank=True)
    revision = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='reviewed_course_versions')
    rejection_reason = models.TextField(blank=True, default='')
    legacy_import = models.BooleanField(default=False, editable=False)

    class Meta:
        ordering = ['number', 'id']
        constraints = [
            models.UniqueConstraint(fields=['course', 'number'], name='course_version_number_unique'),
            models.UniqueConstraint(fields=['course'], condition=Q(state__in=['draft', 'submitted', 'rejected']), name='one_working_version_per_course'),
            models.CheckConstraint(condition=Q(number__gte=1), name='version_number_positive'),
            models.CheckConstraint(condition=Q(revision__gte=1), name='version_revision_positive'),
            models.CheckConstraint(condition=Q(state__in=['draft', 'submitted', 'rejected', 'published']), name='version_state_valid'),
        ]


class CourseNode(models.Model):
    class Kind(models.TextChoices):
        SECTION = 'section', 'Section'
        TOPIC = 'topic', 'Topic'
        LESSON = 'lesson', 'Lesson'

    version = models.ForeignKey(CourseVersion, on_delete=models.CASCADE, related_name='nodes')
    kind = models.CharField(max_length=7, choices=Kind.choices)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    title = models.CharField(max_length=200)
    position = models.PositiveIntegerField()

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(fields=['version', 'parent', 'position'], name='node_sibling_position_unique'),
            models.UniqueConstraint(fields=['version', 'position'], condition=Q(parent__isnull=True), name='node_root_position_unique'),
            models.CheckConstraint(condition=Q(position__gte=1), name='node_position_positive'),
            models.CheckConstraint(condition=(Q(kind='section', parent__isnull=True) | Q(kind__in=['topic', 'lesson'], parent__isnull=False)), name='node_parent_shape_valid'),
        ]

    def clean(self):
        super().clean()
        expected = {self.Kind.TOPIC: self.Kind.SECTION, self.Kind.LESSON: self.Kind.TOPIC}
        if self.kind == self.Kind.SECTION:
            if self.parent_id is not None:
                raise ValidationError({'parent': 'Section cannot have a parent.'})
        elif self.kind in expected:
            if self.parent_id is None or self.parent.kind != expected[self.kind] or self.parent.version_id != self.version_id:
                raise ValidationError({'parent': 'Parent must have the preceding level in the same version.'})


class NodePrerequisite(models.Model):
    target = models.OneToOneField(CourseNode, on_delete=models.CASCADE, related_name='prerequisite')
    source = models.ForeignKey(CourseNode, on_delete=models.PROTECT, related_name='prerequisite_dependents')
    threshold = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(threshold__gte=1, threshold__lte=100), name='prerequisite_threshold_range'),
            models.CheckConstraint(condition=~Q(target=models.F('source')), name='prerequisite_not_self'),
        ]


class CourseAsset(models.Model):
    class State(models.TextChoices):
        READY = 'ready', 'Ready'
        PENDING_DELETE = 'pending_delete', 'Pending delete'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='assets')
    file = models.FileField(storage=PrivateMediaStorage(), upload_to=course_asset_path, max_length=255)
    original_name = models.CharField(max_length=255)
    media_type = models.CharField(max_length=100)
    size_bytes = models.PositiveBigIntegerField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='course_assets')
    created_at = models.DateTimeField(auto_now_add=True)
    state = models.CharField(max_length=14, choices=State.choices, default=State.READY)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(size_bytes__gt=0), name='asset_size_positive'),
            models.CheckConstraint(condition=Q(state__in=['ready', 'pending_delete']), name='asset_state_valid'),
        ]


class LessonItem(models.Model):
    class Category(models.TextChoices):
        THEORY = 'theory', 'Theory'
        PRACTICE = 'practice', 'Practice'

    class Format(models.TextChoices):
        MARKDOWN = 'markdown', 'Markdown'
        PDF = 'pdf', 'PDF'
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
        TEXT = 'text', 'Text'
        TEXT_IMAGE = 'text_image', 'Text and image'

    class AnswerMode(models.TextChoices):
        OPEN = 'open', 'Open'
        KEYED = 'keyed', 'Keyed'

    lesson = models.ForeignKey(CourseNode, on_delete=models.CASCADE, related_name='items')
    category = models.CharField(max_length=8, choices=Category.choices)
    format = models.CharField(max_length=10, choices=Format.choices)
    position = models.PositiveIntegerField()
    text = models.TextField(blank=True, default='')
    asset = models.ForeignKey(CourseAsset, on_delete=models.PROTECT, null=True, blank=True, related_name='items')
    video_url = models.URLField(blank=True, default='')
    image_alt = models.CharField(max_length=255, blank=True, default='')
    answer_mode = models.CharField(max_length=5, choices=AnswerMode.choices, default=AnswerMode.OPEN)
    answer_text = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(fields=['lesson', 'category', 'position'], name='lesson_item_position_unique'),
            models.CheckConstraint(condition=Q(position__gte=1), name='lesson_item_position_positive'),
            models.CheckConstraint(condition=(Q(answer_mode='open', answer_text__isnull=True) | Q(answer_mode='keyed', category='practice', answer_text__isnull=False) & ~Q(answer_text='')), name='lesson_item_answer_valid'),
            models.CheckConstraint(condition=(Q(category='theory', format__in=['markdown', 'pdf', 'image', 'video']) | Q(category='practice', format__in=['text', 'text_image', 'pdf', 'image'])), name='lesson_item_format_valid'),
        ]

    def clean(self):
        super().clean()
        if self.lesson_id and self.lesson.kind != CourseNode.Kind.LESSON:
            raise ValidationError({'lesson': 'Materials require a lesson.'})
        if self.asset_id and self.lesson_id and self.asset.course_id != self.lesson.version.course_id:
            raise ValidationError({'asset': 'Asset must belong to this course.'})


class NodeTest(models.Model):
    node = models.OneToOneField(CourseNode, on_delete=models.CASCADE, related_name='test')


class TestQuestion(models.Model):
    class Type(models.TextChoices):
        SINGLE = 'single', 'Single'
        MULTIPLE = 'multiple', 'Multiple'

    test = models.ForeignKey(NodeTest, on_delete=models.CASCADE, related_name='questions')
    position = models.PositiveIntegerField()
    text = models.TextField(blank=True, default='')
    type = models.CharField(max_length=8, choices=Type.choices, default=Type.SINGLE)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(fields=['test', 'position'], name='test_question_position_unique'),
            models.CheckConstraint(condition=Q(position__gte=1), name='test_question_position_positive'),
            models.CheckConstraint(condition=Q(type__in=['single', 'multiple']), name='test_question_type_valid'),
        ]


class TestOption(models.Model):
    question = models.ForeignKey(TestQuestion, on_delete=models.CASCADE, related_name='options')
    position = models.PositiveIntegerField()
    text = models.TextField(blank=True, default='')
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(fields=['question', 'position'], name='test_option_position_unique'),
            models.CheckConstraint(condition=Q(position__gte=1), name='test_option_position_positive'),
        ]
