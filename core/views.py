from django.shortcuts import render


def home(request):
    return render(request, 'core/home.html')


def build(request):
    return render(request, 'core/build.html')


def sandbox(request):
    return render(request, 'core/build.html', {'online_mode': True})


def cards(request):
    return render(request, 'core/cards.html')


def report(request):
    return render(request, 'core/report.html')


def feedback(request):
    return render(request, 'core/feedback.html')
