import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('learning', '0007_lesson_cycles'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstanceLessonProgress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[
                    ('todo', 'Do zrobienia'), ('revision', 'Do poprawy'),
                    ('in_progress', 'W trakcie'), ('review', 'Do sprawdzenia'), ('done', 'Zrobione'),
                ], max_length=12)),
                ('revision', models.PositiveIntegerField()),
                ('instance', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lesson_progress', to='learning.instance',
                )),
                ('lesson', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='instance_progress', to='learning.coursenode',
                )),
            ],
            options={
                'ordering': ['lesson_id'],
                'constraints': [
                    models.UniqueConstraint(fields=('instance', 'lesson'), name='one_instance_lesson_progress'),
                    models.UniqueConstraint(
                        condition=models.Q(status='in_progress'), fields=('instance',),
                        name='one_in_progress_lesson_per_instance',
                    ),
                    models.CheckConstraint(
                        condition=models.Q(status__in=['todo', 'revision', 'in_progress', 'review', 'done']),
                        name='lesson_progress_status_valid',
                    ),
                    models.CheckConstraint(
                        condition=models.Q(revision__gte=1), name='lesson_progress_revision_positive',
                    ),
                ],
            },
        ),
    ]
