import json
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.shortcuts import redirect, render, get_object_or_404
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Sum, Q
from .models import Post, Tag, Like, Comment, UserProfile, Friendship

SISAKET_DISTRICTS = [
    "อ.เมืองศรีสะเกษ",
    "อ.กันทรลักษ์",
    "อ.กันทรารมย์",
    "อ.ขุขันธ์",
    "อ.ขุนหาญ",
    "อ.ปรางค์กู่",
    "อ.อุทุมพรพิสัย",
    "อ.ราษีไศล",
    "อ.ยางชุมน้อย",
    "อ.ห้วยทับทัน",
    "อ.โนนคูณ",
    "อ.ศรีรัตนะ",
    "อ.น้ำเกลี้ยง",
    "อ.วังหิน",
    "อ.ภูสิงห์",
    "อ.เมืองจันทร์",
    "อ.เบญจลักษ์",
    "อ.พยุห์",
    "อ.โพธิ์ศรีสุวรรณ",
    "อ.ศิลาลาด",
    "อ.บึงบูรพ์",
    "อ.ไพรบึง",
]

SAMPLE_POSTS = [
    {
        "post_id": 0,
        "author": "น้ำฝน จากกันทรลักษ์",
        "author_username": "namfon",
        "author_avatar": None,
        "location": "อ.กันทรลักษ์",
        "location_name": "สวนทุเรียนภูเขาไฟ ลำดวน",
        "latitude": 14.6468,
        "longitude": 104.6508,
        "google_maps_url": "https://www.google.com/maps?q=14.6468,104.6508",
        "time_ago": "2 ชั่วโมงที่แล้ว",
        "text": "เช้านี้ไปเก็บทุเรียนภูเขาไฟที่สวนตากับพ่อ ปีนี้ลูกดกมาก หอมไปทั้งสวนเลยค่ะ 🌾",
        "media": None,
        "media_type": "image",
        "media_caption": "สวนทุเรียนภูเขาไฟ กันทรลักษ์",
        "tags": ["ทุเรียนภูเขาไฟ", "กันทรลักษ์", "เกษตรกรรม"],
        "likes": 128,
        "comments": 24,
        "is_liked": False,
    },
    {
        "post_id": 0,
        "author": "ทีมเที่ยวศรีสะเกษ",
        "author_username": "tripssk",
        "author_avatar": None,
        "location": "อ.กันทรลักษ์",
        "location_name": "ผามออีแดง อุทยานแห่งชาติเขาพระวิหาร",
        "latitude": 14.3986,
        "longitude": 104.7082,
        "google_maps_url": "https://www.google.com/maps?q=14.3986,104.7082",
        "time_ago": "5 ชั่วโมงที่แล้ว",
        "text": "วิวพระอาทิตย์ขึ้นที่ผามออีแดง มองเห็นปราสาทเขาพระวิหารชัดมาก ใครไปช่วงนี้บอกเลยว่าคุ้มตื่นเช้าสุด ๆ",
        "media": None,
        "media_type": "video",
        "media_caption": "ผามออีแดง ยามเช้า",
        "tags": ["เขาพระวิหาร", "ท่องเที่ยว", "ผามออีแดง"],
        "likes": 342,
        "comments": 51,
        "is_liked": False,
    },
]

TRENDING_TAGS = [
    {"name": "ทุเรียนภูเขาไฟ", "count": 214},
    {"name": "เขาพระวิหาร", "count": 189},
    {"name": "ข้าวหอมมะลิ", "count": 132},
    {"name": "งานเทศกาล", "count": 98},
    {"name": "เมืองศรีสะเกษ", "count": 87},
]

ACTIVE_PLACES = [
    {"name": "อ.กันทรลักษ์", "count": 312},
    {"name": "อ.เมืองศรีสะเกษ", "count": 260},
    {"name": "อ.ขุนหาญ", "count": 145},
    {"name": "อ.ราษีไศล", "count": 88},
]


def _auth_context(request):
    avatar_url = None
    location = None
    bio = None
    friends_count = 0
    if request.user.is_authenticated:
        profile_obj, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile_obj.avatar:
            try:
                avatar_url = profile_obj.avatar.url
            except Exception:
                avatar_url = None
        location = profile_obj.location
        bio = profile_obj.bio
        friends_count = Friendship.objects.filter(user=request.user).count()
    return {
        "user_authenticated": request.user.is_authenticated,
        "current_user": request.user if request.user.is_authenticated else None,
        "display_name": (request.user.first_name or request.user.username) if request.user.is_authenticated else None,
        "user_avatar_url": avatar_url,
        "user_location": location,
        "user_bio": bio,
        "friends_count": friends_count,
        "districts": SISAKET_DISTRICTS,
    }


def _serialize_post(p, current_user=None):
    display_author = p.author.first_name or p.author.username
    avatar_url = None
    user_location = "ศรีสะเกษ"
    if hasattr(p.author, 'userprofile') and p.author.userprofile:
        if p.author.userprofile.avatar:
            try:
                avatar_url = p.author.userprofile.avatar.url
            except Exception:
                avatar_url = None
        if p.author.userprofile.location:
            user_location = p.author.userprofile.location

    is_liked = False
    if current_user and current_user.is_authenticated:
        is_liked = p.likes.filter(user=current_user).exists()

    likes_count = getattr(p, 'likes_count', None)
    if likes_count is None:
        likes_count = p.likes.count()

    comments_count = getattr(p, 'comments_count', None)
    if comments_count is None:
        comments_count = p.comments.count()

    can_edit = bool(current_user and current_user.is_authenticated and (current_user == p.author or current_user.is_staff))
    is_author = bool(current_user and current_user.is_authenticated and current_user == p.author)

    return {
        "post_id": p.id,
        "author": display_author,
        "author_username": p.author.username,
        "author_avatar": avatar_url,
        "location": user_location,
        "location_name": p.location_name,
        "location_url": p.location_url,
        "latitude": float(p.latitude) if p.latitude is not None else None,
        "longitude": float(p.longitude) if p.longitude is not None else None,
        "google_maps_url": p.google_maps_url,
        "time_ago": p.created_at.strftime("%d/%m/%Y %H:%M"),
        "text": p.text,
        "media": p.media,
        "is_video": p.is_video,
        "tags": [t.name for t in p.tags.all()],
        "likes": likes_count,
        "comments": comments_count,
        "is_liked": is_liked,
        "can_edit": can_edit,
        "is_author": is_author,
    }


def index(request):
    return redirect("feed")


@ensure_csrf_cookie
def feed(request):
    tag_filter = request.GET.get('tag', '').strip().lstrip('#')
    
    posts_qs = Post.objects.all().select_related('author', 'author__userprofile').prefetch_related('tags', 'likes', 'comments').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', distinct=True)
    )

    if tag_filter:
        posts_qs = posts_qs.filter(tags__name__iexact=tag_filter)

    posts_qs = posts_qs.order_by('-created_at')

    posts_data = [_serialize_post(p, request.user) for p in posts_qs]

    display_posts = posts_data if (posts_data or tag_filter) else SAMPLE_POSTS

    context = {
        "posts": display_posts,
        "trending_tags": TRENDING_TAGS,
        "active_places": ACTIVE_PLACES,
        "current_tag": tag_filter,
    }
    context.update(_auth_context(request))
    return render(request, "sskapp/feed.html", context)


def create_post(request):
    if not request.user.is_authenticated:
        return redirect("login")

    if request.method == "POST":
        text = request.POST.get("text", "").strip()
        media_file = request.FILES.get("media")
        tags_raw = request.POST.get("tags", "")
        location_name = request.POST.get("location_name", "").strip()
        location_url = request.POST.get("location_url", "").strip()
        latitude_raw = request.POST.get("latitude", "").strip()
        longitude_raw = request.POST.get("longitude", "").strip()

        latitude = None
        longitude = None
        if latitude_raw and longitude_raw:
            try:
                latitude = float(latitude_raw)
                longitude = float(longitude_raw)
            except (ValueError, TypeError):
                latitude = None
                longitude = None

        if text or media_file or location_name or location_url:
            post = Post.objects.create(
                author=request.user,
                text=text,
                media=media_file,
                location_name=location_name or None,
                location_url=location_url or None,
                latitude=latitude,
                longitude=longitude,
            )
            if tags_raw:
                try:
                    tag_list = json.loads(tags_raw)
                    if not isinstance(tag_list, list):
                        tag_list = [t.strip() for t in tags_raw.split(",") if t.strip()]
                except Exception:
                    tag_list = [t.strip() for t in tags_raw.split(",") if t.strip()]

                for tag_name in tag_list:
                    tag_name = tag_name.strip().lstrip('#')
                    if tag_name:
                        tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                        post.tags.add(tag_obj)
            return redirect("feed")

    context = _auth_context(request)
    return render(request, "sskapp/create_post.html", context)


def edit_post(request, post_id):
    if not request.user.is_authenticated:
        return redirect("login")

    post = get_object_or_404(Post, id=post_id)
    if post.author != request.user and not request.user.is_staff:
        return HttpResponseForbidden("คุณไม่มีสิทธิ์แก้ไขโพสต์นี้")

    if request.method == "POST":
        text = request.POST.get("text", "").strip()
        media_file = request.FILES.get("media")
        remove_media = request.POST.get("remove_media") == "1"
        tags_raw = request.POST.get("tags", "")
        location_name = request.POST.get("location_name", "").strip()
        location_url = request.POST.get("location_url", "").strip()
        latitude_raw = request.POST.get("latitude", "").strip()
        longitude_raw = request.POST.get("longitude", "").strip()

        latitude = None
        longitude = None
        if latitude_raw and longitude_raw:
            try:
                latitude = float(latitude_raw)
                longitude = float(longitude_raw)
            except (ValueError, TypeError):
                latitude = None
                longitude = None

        post.text = text
        if media_file:
            post.media = media_file
        elif remove_media and post.media:
            post.media.delete(save=False)
            post.media = None

        post.location_name = location_name or None
        post.location_url = location_url or None
        post.latitude = latitude
        post.longitude = longitude
        post.save()

        # Update tags
        post.tags.clear()
        if tags_raw:
            try:
                tag_list = json.loads(tags_raw)
                if not isinstance(tag_list, list):
                    tag_list = [t.strip() for t in tags_raw.split(",") if t.strip()]
            except Exception:
                tag_list = [t.strip() for t in tags_raw.split(",") if t.strip()]

            for tag_name in tag_list:
                tag_name = tag_name.strip().lstrip('#')
                if tag_name:
                    tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                    post.tags.add(tag_obj)

        messages.success(request, "แก้ไขโพสต์เรียบร้อยแล้ว")
        return redirect("feed")

    context = _auth_context(request)
    existing_tags = [t.name for t in post.tags.all()]
    context.update({
        "post": post,
        "existing_tags": existing_tags,
        "existing_tags_json": json.dumps(existing_tags, ensure_ascii=False),
        "latitude_val": float(post.latitude) if post.latitude is not None else "",
        "longitude_val": float(post.longitude) if post.longitude is not None else "",
    })
    return render(request, "sskapp/edit_post.html", context)


def delete_post(request, post_id):
    if not request.user.is_authenticated:
        if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
            return JsonResponse({"error": "กรุณาเข้าสู่ระบบก่อนดำเนินการ", "authenticated": False}, status=401)
        return redirect("login")

    post = get_object_or_404(Post, id=post_id)
    if post.author != request.user and not request.user.is_staff:
        if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
            return JsonResponse({"error": "คุณไม่มีสิทธิ์ลบโพสต์นี้"}, status=403)
        return HttpResponseForbidden("คุณไม่มีสิทธิ์ลบโพสต์นี้")

    if request.method in ["POST", "DELETE"]:
        post_id_val = post.id
        if post.media:
            try:
                post.media.delete(save=False)
            except Exception:
                pass
        post.delete()

        if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
            return JsonResponse({"success": True, "post_id": post_id_val, "message": "ลบโพสต์สำเร็จ"})

        messages.success(request, "ลบโพสต์เรียบร้อยแล้ว")
        referer = request.META.get("HTTP_REFERER")
        if referer and "/edit" not in referer and "/delete" not in referer:
            return redirect(referer)
        return redirect("feed")

    return redirect("feed")



@require_POST
def toggle_like(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'กรุณาเข้าสู่ระบบก่อนกดถูกใจ', 'authenticated': False}, status=401)

    post_id = request.POST.get('post_id')
    if not post_id or post_id == '0':
        return JsonResponse({'error': 'Invalid post'}, status=400)

    post = get_object_or_404(Post, id=post_id)

    like, created = Like.objects.get_or_create(user=request.user, post=post)

    if not created:
        like.delete()
        liked = False
    else:
        liked = True

    likes_count = post.likes.count()

    return JsonResponse({
        'success': True,
        'liked': liked,
        'likes_count': likes_count
    })


def get_comments(request, post_id):
    if not post_id or post_id == 0:
        return JsonResponse({'comments': []})

    post = get_object_or_404(Post, id=post_id)
    comments = post.comments.select_related('author', 'author__userprofile').order_by('created_at')

    data = []
    for c in comments:
        avatar_url = None
        if hasattr(c.author, 'userprofile') and c.author.userprofile and c.author.userprofile.avatar:
            try:
                avatar_url = c.author.userprofile.avatar.url
            except Exception:
                avatar_url = None

        data.append({
            'id': c.id,
            'author_name': c.author.first_name or c.author.username,
            'author_username': c.author.username,
            'avatar_url': avatar_url,
            'avatar_letter': (c.author.first_name or c.author.username)[0].upper(),
            'text': c.text,
            'created_at': c.created_at.strftime("%d/%m/%Y %H:%M"),
        })

    return JsonResponse({'comments': data})


@require_POST
def add_comment(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น', 'authenticated': False}, status=401)

    post_id = request.POST.get('post_id')
    text = request.POST.get('text', '').strip()

    if not post_id or post_id == '0':
        return JsonResponse({'error': 'Invalid post'}, status=400)

    if not text:
        return JsonResponse({'error': 'กรุณากรอกข้อความความคิดเห็น'}, status=400)

    post = get_object_or_404(Post, id=post_id)

    comment = Comment.objects.create(
        post=post,
        author=request.user,
        text=text
    )

    avatar_url = None
    if hasattr(request.user, 'userprofile') and request.user.userprofile and request.user.userprofile.avatar:
        try:
            avatar_url = request.user.userprofile.avatar.url
        except Exception:
            avatar_url = None

    author_display = request.user.first_name or request.user.username

    return JsonResponse({
        'success': True,
        'comment': {
            'id': comment.id,
            'author': request.user.username,
            'author_name': author_display,
            'avatar_url': avatar_url,
            'avatar_letter': author_display[0].upper(),
            'text': comment.text,
            'created_at': comment.created_at.strftime("%d/%m/%Y %H:%M"),
        },
        'comments_count': post.comments.count()
    })


@require_POST
def toggle_friend(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน', 'authenticated': False}, status=401)

    target_username = request.POST.get('username', '').strip()
    if not target_username or target_username == request.user.username:
        return JsonResponse({'error': 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้'}, status=400)

    target_user = get_object_or_404(User, username=target_username)

    friendship, created = Friendship.objects.get_or_create(user=request.user, friend=target_user)

    if not created:
        friendship.delete()
        is_friend = False
    else:
        is_friend = True

    friends_count = Friendship.objects.filter(friend=target_user).count()

    return JsonResponse({
        'success': True,
        'is_friend': is_friend,
        'friends_count': friends_count,
        'target_username': target_username
    })


@ensure_csrf_cookie
@login_required
def profile(request):
    user_prof, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == "POST":
        display_name = request.POST.get("display_name", "").strip()
        bio = request.POST.get("bio", "").strip()
        location = request.POST.get("location", "").strip()
        website = request.POST.get("website", "").strip()
        avatar_file = request.FILES.get("avatar")

        if display_name:
            request.user.first_name = display_name[:30]
            request.user.save()

        user_prof.bio = bio
        user_prof.location = location
        user_prof.website = website
        if avatar_file:
            user_prof.avatar = avatar_file
        user_prof.save()

        messages.success(request, "บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว")
        return redirect("profile")

    # Get user's posts with like & comment counts
    user_posts_qs = Post.objects.filter(author=request.user).order_by('-created_at').prefetch_related('tags', 'likes', 'comments').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', distinct=True)
    )

    total_likes = sum(p.likes_count for p in user_posts_qs)
    total_comments = sum(p.comments_count for p in user_posts_qs)

    user_posts_data = [_serialize_post(p, request.user) for p in user_posts_qs]

    # Get list of friends (users that the current user has added)
    friendships = Friendship.objects.filter(user=request.user).select_related('friend', 'friend__userprofile')
    friends_list = []
    for f in friendships:
        fr = f.friend
        av = None
        loc = "ศรีสะเกษ"
        if hasattr(fr, 'userprofile') and fr.userprofile:
            if fr.userprofile.avatar:
                try:
                    av = fr.userprofile.avatar.url
                except Exception:
                    av = None
            if fr.userprofile.location:
                loc = fr.userprofile.location
        friends_list.append({
            "username": fr.username,
            "display_name": fr.first_name or fr.username,
            "avatar_url": av,
            "location": loc,
        })

    context = {
        "profile": user_prof,
        "user_posts": user_posts_data,
        "friends_list": friends_list,
        "total_posts_count": user_posts_qs.count(),
        "total_likes_count": total_likes,
        "total_comments_count": total_comments,
        "total_friends_count": len(friends_list),
        "is_own_profile": True,
    }
    context.update(_auth_context(request))
    return render(request, "sskapp/profile.html", context)


@ensure_csrf_cookie
def user_profile_view(request, username):
    if request.user.is_authenticated and request.user.username == username:
        return redirect("profile")

    target_user = get_object_or_404(User, username=username)
    user_prof, _ = UserProfile.objects.get_or_create(user=target_user)

    is_friend = False
    if request.user.is_authenticated:
        is_friend = Friendship.objects.filter(user=request.user, friend=target_user).exists()

    user_posts_qs = Post.objects.filter(author=target_user).order_by('-created_at').prefetch_related('tags', 'likes', 'comments').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', distinct=True)
    )

    total_likes = sum(p.likes_count for p in user_posts_qs)
    total_comments = sum(p.comments_count for p in user_posts_qs)

    avatar_url = None
    if user_prof.avatar:
        try:
            avatar_url = user_prof.avatar.url
        except Exception:
            avatar_url = None

    user_posts_data = [_serialize_post(p, request.user) for p in user_posts_qs]

    # Target user's friends count
    friends_count = Friendship.objects.filter(friend=target_user).count()

    context = {
        "target_user": target_user,
        "profile": user_prof,
        "target_display_name": target_user.first_name or target_user.username,
        "target_avatar_url": avatar_url,
        "is_friend": is_friend,
        "user_posts": user_posts_data,
        "total_posts_count": user_posts_qs.count(),
        "total_likes_count": total_likes,
        "total_comments_count": total_comments,
        "total_friends_count": friends_count,
        "is_own_profile": False,
    }
    context.update(_auth_context(request))
    return render(request, "sskapp/user_profile.html", context)


@ensure_csrf_cookie
def search_view(request):
    query = request.GET.get('q', '').strip()
    tag_query = query.lstrip('#')

    posts_results = []
    people_results = []
    tags_results = []

    if query:
        # 1. Search Posts (including location name)
        matching_posts = Post.objects.filter(
            Q(text__icontains=query) | Q(tags__name__icontains=tag_query) | Q(location_name__icontains=query)
        ).distinct().order_by('-created_at').select_related('author', 'author__userprofile').prefetch_related('tags', 'likes', 'comments').annotate(
            likes_count=Count('likes', distinct=True),
            comments_count=Count('comments', distinct=True)
        )

        posts_results = [_serialize_post(p, request.user) for p in matching_posts]

        # 2. Search People
        matching_users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(userprofile__location__icontains=query) |
            Q(userprofile__bio__icontains=query)
        ).distinct().select_related('userprofile')

        my_friends_set = set()
        if request.user.is_authenticated:
            my_friends_set = set(Friendship.objects.filter(user=request.user).values_list('friend__username', flat=True))

        for u in matching_users:
            av = None
            bio = ""
            loc = "ศรีสะเกษ"
            if hasattr(u, 'userprofile') and u.userprofile:
                if u.userprofile.avatar:
                    try:
                        av = u.userprofile.avatar.url
                    except Exception:
                        av = None
                bio = u.userprofile.bio
                loc = u.userprofile.location or "ศรีสะเกษ"

            is_me = request.user.is_authenticated and request.user.username == u.username

            people_results.append({
                "username": u.username,
                "display_name": u.first_name or u.username,
                "avatar_url": av,
                "bio": bio,
                "location": loc,
                "is_friend": u.username in my_friends_set,
                "is_me": is_me,
            })

        # 3. Search Tags
        tags_results = list(Tag.objects.filter(name__icontains=tag_query).annotate(posts_count=Count('post')).order_by('-posts_count')[:10])

    context = {
        "query": query,
        "posts_results": posts_results,
        "people_results": people_results,
        "tags_results": tags_results,
        "total_results": len(posts_results) + len(people_results) + len(tags_results),
    }
    context.update(_auth_context(request))
    return render(request, "sskapp/search.html", context)


def login_view(request):
    if request.user.is_authenticated:
        return redirect("feed")

    error = None
    next_url = request.GET.get('next') or request.POST.get('next') or 'feed'

    if request.method == "POST":
        login_input = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        
        user = authenticate(request, username=login_input, password=password)
        if user is not None:
            auth_login(request, user)
            return redirect(next_url)
        error = "ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"

    return render(request, "sskapp/login.html", {"error": error, "next": next_url})


def register_view(request):
    if request.user.is_authenticated:
        return redirect("feed")

    error = None
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")
        display_name = request.POST.get("display_name", "").strip()

        if not username or not password:
            error = "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน"
        elif User.objects.filter(username=username).exists():
            error = "มีชื่อผู้ใช้นี้ในระบบแล้ว กรุณาเลือกชื่ออื่น"
        else:
            user = User.objects.create_user(
                username=username, email=email, password=password,
                first_name=display_name[:30],
            )
            UserProfile.objects.create(user=user)
            auth_login(request, user)
            return redirect("feed")

    return render(request, "sskapp/register.html", {"error": error})


def logout_view(request):
    if request.method == "POST":
        auth_logout(request)
        return redirect("feed")

    context = _auth_context(request)
    return render(request, "sskapp/logout.html", context)