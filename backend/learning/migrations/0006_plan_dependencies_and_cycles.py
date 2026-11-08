from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('learning', '0005_seed_classifications')]

    operations = [
        migrations.RemoveConstraint(model_name='instance', name='one_active_instance_per_student'),
        migrations.AddConstraint(
            model_name='instance',
            constraint=models.UniqueConstraint(fields=('student', 'course'), condition=models.Q(status='active'),
                                               name='one_active_instance_per_student_course'),
        ),
        migrations.AddField(
            model_name='coursetask', name='prerequisites',
            field=models.ManyToManyField(blank=True, related_name='dependents', symmetrical=False, to='learning.coursetask'),
        ),
        migrations.AddField(
            model_name='instancetask', name='prerequisites',
            field=models.ManyToManyField(blank=True, related_name='dependents', symmetrical=False, to='learning.instancetask'),
        ),
        migrations.CreateModel(
            name='InstanceCycle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('started_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('instance', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cycles', to='learning.instance')),
            ],
            options={
                'ordering': ['started_at', 'id'],
                'constraints': [models.UniqueConstraint(fields=('instance',), condition=models.Q(ended_at__isnull=True),
                                                       name='one_active_cycle_per_instance')],
            },
        ),
        migrations.CreateModel(
            name='InstanceCycleTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('todo', 'Do zrobienia'), ('in_progress', 'W trakcie'), ('done', 'Zrobione')], max_length=12)),
                ('removed_at', models.DateTimeField(blank=True, null=True)),
                ('cycle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='entries', to='learning.instancecycle')),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='cycle_entries', to='learning.instancetask')),
            ],
            options={
                'ordering': ['id'],
                'constraints': [models.UniqueConstraint(fields=('cycle', 'task'), name='one_task_entry_per_cycle')],
            },
        ),
    ]
