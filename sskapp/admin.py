from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Post, Tag, UserProfile, Like, Comment, Friendship

# Customize Django Admin Header and Title
admin.site.site_header = "ระบบจัดการ ศรีสะเกษ Community"
admin.site.site_title = "Sisaket Community Admin"
admin.site.index_title = "แดชบอร์ดการจัดการข้อมูล"

# Define an inline admin descriptor for UserProfile model
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'ข้อมูลโปรไฟล์เพิ่มเติม'

# Define a new User admin
class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline, )
    list_display = ('username', 'email', 'first_name', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'location_name', 'short_text', 'created_at', 'has_media')
    list_filter = ('created_at', 'tags')
    search_fields = ('text', 'author__username', 'author__first_name', 'location_name', 'location_url')
    date_hierarchy = 'created_at'

    def short_text(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    short_text.short_description = 'เนื้อหาโพสต์'

    def has_media(self, obj):
        return bool(obj.media)
    has_media.boolean = True
    has_media.short_description = 'มีรูป/วิดีโอ'

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'author', 'short_text', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text', 'author__username', 'post__text')

    def short_text(self, obj):
        return obj.text[:40] + '...' if len(obj.text) > 40 else obj.text
    short_text.short_description = 'ข้อความ'

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'post__text')

@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'friend', 'created_at')
    search_fields = ('user__username', 'friend__username')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'location', 'website')
    search_fields = ('user__username', 'user__first_name', 'location', 'bio')
    list_filter = ('location',)
