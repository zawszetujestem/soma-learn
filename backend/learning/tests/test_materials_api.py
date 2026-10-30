from learning.models import LessonItem
from learning.tests.content_helpers import ContentAPICase


class MaterialsAPITests(ContentAPICase):
    @property
    def path(self):
        return f'lessons/{self.lesson.pk}/items/'

    def test_format_matrix_and_open_clears_answer(self):
        image = self.asset()
        pdf = self.asset('application/pdf')
        for category, fmt, extra in (
            ('theory', 'markdown', {'text': '**Theory**'}),
            ('theory', 'pdf', {'asset_id': str(pdf.pk)}),
            ('theory', 'image', {'asset_id': str(image.pk), 'image_alt': 'Alt'}),
            ('theory', 'video', {'video_url': 'https://youtu.be/abc'}),
            ('practice', 'text', {'text': 'Task'}),
            (
                'practice',
                'text_image',
                {'text': 'Task', 'asset_id': str(image.pk), 'image_alt': 'Alt'},
            ),
            ('practice', 'pdf', {'asset_id': str(pdf.pk)}),
            ('practice', 'image', {'asset_id': str(image.pk), 'image_alt': 'Alt'}),
        ):
            response = self.write(
                'post', self.path, dict(category=category, format=fmt, **extra)
            )
            self.assertEqual(response.status_code, 201, response.content)
            if category == 'theory':
                self.assertNotIn('answer_text', response.data)
        response = self.write(
            'post',
            self.path,
            {
                'category': 'practice',
                'format': 'text',
                'text': 'T',
                'answer_mode': 'keyed',
                'answer_text': 'A',
            },
        )
        pk = response.data['id']
        response = self.write('patch', self.path + f'{pk}/', {'answer_mode': 'open'})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(LessonItem.objects.get(pk=pk).answer_text)
        self.assertEqual(self.write('delete', self.path + f'{pk}/').status_code, 204)

    def test_invalid_materials_and_video_allowlist(self):
        image = self.asset()
        for data in (
            {'category': 'theory', 'format': 'markdown', 'text': '  '},
            {
                'category': 'practice',
                'format': 'text',
                'text': 'T',
                'answer_mode': 'keyed',
                'answer_text': ' ',
            },
            {'category': 'theory', 'format': 'pdf', 'asset_id': str(image.pk)},
            {'category': 'theory', 'format': 'image', 'asset_id': str(image.pk)},
            {'category': 'practice', 'format': 'markdown', 'text': 'T'},
            {
                'category': 'theory',
                'format': 'markdown',
                'text': 'T',
                'asset_id': str(image.pk),
            },
        ):
            self.error(self.write('post', self.path, data), 400, 'invalid_material')
        for url in (
            'http://youtube.com/a',
            'javascript:alert(1)',
            'https://youtube.com.evil.org/a',
            'https://youtube.com@evil.org/a',
            'https://youtube.com:444/a',
            'https://evil.org/a',
            'https://www.youtube.com./a',
            'https://@youtube.com/a',
            'https://:pass@youtube.com/a',
        ):
            self.error(
                self.write(
                    'post',
                    self.path,
                    {'category': 'theory', 'format': 'video', 'video_url': url},
                ),
                400,
                'invalid_video_url',
            )
        for host in (
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be',
            'vimeo.com',
            'www.vimeo.com',
        ):
            self.assertEqual(
                self.write(
                    'post',
                    self.path,
                    {
                        'category': 'theory',
                        'format': 'video',
                        'video_url': f'https://{host}/a',
                    },
                ).status_code,
                201,
            )

    def test_attachment_occurrences_20_21_and_reuse(self):
        image = self.asset()
        data = {
            'category': 'theory',
            'format': 'image',
            'asset_id': str(image.pk),
            'image_alt': 'Alt',
        }
        for _ in range(20):
            self.assertEqual(self.write('post', self.path, data).status_code, 201)
        self.error(
            self.write('post', self.path, dict(data, category='practice')),
            409,
            'attachment_limit_exceeded',
        )
        item = self.lesson.items.first()
        self.assertEqual(
            self.write(
                'patch', self.path + f'{item.pk}/', {'image_alt': 'New'}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.write('delete', self.path + f'{item.pk}/').status_code, 204
        )
        self.assertEqual(self.write('post', self.path, data).status_code, 201)

    def test_material_immutability_and_move(self):
        first = self.write(
            'post',
            self.path,
            {'category': 'theory', 'format': 'markdown', 'text': 'One'},
        ).data
        second = self.write(
            'post',
            self.path,
            {'category': 'theory', 'format': 'markdown', 'text': 'Two'},
        ).data
        self.error(
            self.write(
                'patch', self.path + f'{first["id"]}/', {'category': 'practice'}
            ),
            400,
            'invalid_material',
        )
        response = self.write(
            'post', self.path + f'{second["id"]}/move/', {'direction': 'up'}
        )
        self.assertTrue(response.data['moved'])
        self.assertEqual(
            list(self.lesson.items.values_list('id', flat=True)),
            [second['id'], first['id']],
        )

    def test_patch_same_category_is_allowed_but_change_is_not(self):
        data = {'category': 'practice', 'format': 'text', 'text': 'Task'}
        response = self.write('post', self.path, data)
        pk = response.data['id']
        response = self.write('patch', self.path + f'{pk}/', dict(data, text='Updated'))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['text'], 'Updated')
        self.error(
            self.write(
                'patch',
                self.path + f'{pk}/',
                {'category': 'theory', 'format': 'markdown', 'text': 'Changed'},
            ),
            400,
            'invalid_material',
        )
