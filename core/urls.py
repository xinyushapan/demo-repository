from django.urls import path

from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('build/', views.build, name='build'),
    path('sandbox/', views.sandbox, name='sandbox'),
    path('feedback/', views.feedback, name='feedback'),
    path('report/', views.report, name='report'),
    path('cards/', views.cards, name='cards'),
]
