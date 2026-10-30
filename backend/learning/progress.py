from decimal import ROUND_HALF_UP, Decimal

from .models import InstanceTask


def calculate_progress(tasks):
    tasks = list(tasks)
    total = sum((task.hours for task in tasks), Decimal('0'))
    if total == 0:
        return Decimal('0.0')
    done = sum((task.hours for task in tasks if task.status == InstanceTask.Status.DONE), Decimal('0'))
    return (done * 100 / total).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
