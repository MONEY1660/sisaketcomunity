"""
URL configuration for sskcomunity project.
"""
from django.contrib import admin
from django.urls import path
from sskapp import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('feed/', views.feed, name='feed'),
    path('post/new/', views.create_post, name='create_post'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
]
