"""Recover interrupted asset deletions and old untracked local uploads."""

import time
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from learning.asset_services import finalize_delete
from learning.models import Course, CourseAsset
from learning.storage import PrivateMediaStorage


class Command(BaseCommand):
    help = 'Retry pending asset deletions and remove untracked private files older than 24h.'

    def add_arguments(self, parser):
        parser.add_argument('--older-than-hours', type=int, default=24)

    def handle(self, *args, **options):
        if options['older_than_hours'] < 1:
            from django.core.management.base import CommandError

            raise CommandError('Minimum age is one hour.')
        deleted = 0
        for course_id, asset_id in CourseAsset.objects.filter(
            state='pending_delete'
        ).values_list('course_id', 'pk'):
            try:
                finalize_delete(course_id, asset_id)
            except OSError:
                self.stderr.write('Asset deletion deferred; retry cleanup later.')
        storage = PrivateMediaStorage()
        root = Path(storage.location)
        cutoff = time.time() - options['older_than_hours'] * 3600
        for folder in (root / 'courses').glob('*'):
            if (
                folder.is_symlink()
                or not folder.is_dir()
                or not folder.name.isdecimal()
            ):
                continue
            for file in folder.iterdir():
                if (
                    not file.is_file()
                    or file.is_symlink()
                    or file.stat().st_mtime >= cutoff
                ):
                    continue
                key = file.relative_to(root).as_posix()
                with transaction.atomic():
                    Course.objects.select_for_update().filter(
                        pk=int(folder.name)
                    ).first()
                    if not CourseAsset.objects.filter(file=key).exists():
                        storage.delete(key)
                        deleted += 1
        temporary = root / 'tmp'
        for file in temporary.glob('*'):
            if (
                file.is_file()
                and not file.is_symlink()
                and file.stat().st_mtime < cutoff
            ):
                file.unlink()
                deleted += 1
        self.stdout.write(
            f'Removed {deleted} untracked/temporary files; pending deletions retried.'
        )
