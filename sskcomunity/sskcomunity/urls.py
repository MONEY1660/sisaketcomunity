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
    path('like/', views.toggle_like, name='toggle_like'),
    path('comment/', views.add_comment, name='add_comment'),
    path('comments/<int:post_id>/', views.get_comments, name='get_comments'),
    path('profile/', views.profile, name='profile'),
    path('profile/<str:username>/', views.user_profile_view, name='user_profile'),
    path('toggle-friend/', views.toggle_friend, name='toggle_friend'),
    path('search/', views.search_view, name='search'),
]


