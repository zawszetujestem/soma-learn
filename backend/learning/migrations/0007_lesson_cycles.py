from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('learning', '0006_plan_dependencies_and_cycles')]

    operations = [
        migrations.CreateModel(
            name='InstanceLessonCycle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[
                    ('planned', 'Planowany'), ('active', 'Aktywny'), ('ended', 'Zakończony'),
                ], default='planned', max_length=10)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('instance', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lesson_cycles', to='learning.instance',
                )),
            ],
            options={
                'ordering': ['-id'],
                'constraints': [
                    models.UniqueConstraint(fields=['instance'], condition=models.Q(status='planned'),
                                            name='one_planned_lesson_cycle'),
                    models.UniqueConstraint(fields=['instance'], condition=models.Q(status='active'),
                                            name='one_active_lesson_cycle'),
                    models.CheckConstraint(condition=models.Q(status__in=['planned', 'active', 'ended']),
                                           name='lesson_cycle_status_valid'),
                    models.CheckConstraint(condition=models.Q(end_date__gt=models.F('start_date')),
                                           name='lesson_cycle_date_range_valid'),
                ],
            },
        ),
        migrations.CreateModel(
            name='InstanceLessonCycleLesson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cycle', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='entries', to='learning.instancelessoncycle',
                )),
                ('lesson', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='lesson_cycle_entries', to='learning.coursenode',
                )),
            ],
            options={
                'ordering': ['id'],
                'constraints': [
                    models.UniqueConstraint(fields=['cycle', 'lesson'], name='one_lesson_entry_per_cycle'),
                ],
            },
        ),
    ]
