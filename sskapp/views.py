import json
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.shortcuts import redirect, render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
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


def index(request):
    return redirect("feed")


def feed(request):
    tag_filter = request.GET.get('tag', '').strip().lstrip('#')
    
    posts_qs = Post.objects.all().select_related('author', 'author__userprofile').prefetch_related('tags', 'likes', 'comments').annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', distinct=True)
    )

    if tag_filter:
        posts_qs = posts_qs.filter(tags__name__iexact=tag_filter)

    posts_qs = posts_qs.order_by('-created_at')

    posts_data = []
    for p in posts_qs:
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
        if request.user.is_authenticated:
            is_liked = p.likes.filter(user=request.user).exists()

        posts_data.append({
            "post_id": p.id,
            "author": display_author,
            "author_username": p.author.username,
            "author_avatar": avatar_url,
            "location": user_location,
            "time_ago": p.created_at.strftime("%d/%m/%Y %H:%M"),
            "text": p.text,
            "media": p.media,
            "is_video": p.is_video,
            "tags": [t.name for t in p.tags.all()],
            "likes": p.likes_count,
            "comments": p.comments_count,
            "is_liked": is_liked,
        })

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

        if text or media_file:
            post = Post.objects.create(
                author=request.user,
                text=text,
                media=media_file,
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


@login_required
@require_POST
def toggle_like(request):
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


@login_required
@require_POST
def add_comment(request):
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


@login_required
@require_POST
def toggle_friend(request):
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

    user_posts_data = []
    for p in user_posts_qs:
        user_posts_data.append({
            "post_id": p.id,
            "author": request.user.first_name or request.user.username,
            "author_username": request.user.username,
            "author_avatar": user_prof.avatar.url if user_prof.avatar else None,
            "location": user_prof.location or "ศรีสะเกษ",
            "time_ago": p.created_at.strftime("%d/%m/%Y %H:%M"),
            "text": p.text,
            "media": p.media,
            "is_video": p.is_video,
            "tags": [t.name for t in p.tags.all()],
            "likes": p.likes_count,
            "comments": p.comments_count,
            "is_liked": p.likes.filter(user=request.user).exists(),
        })

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

    user_posts_data = []
    for p in user_posts_qs:
        user_posts_data.append({
            "post_id": p.id,
            "author": target_user.first_name or target_user.username,
            "author_username": target_user.username,
            "author_avatar": avatar_url,
            "location": user_prof.location or "ศรีสะเกษ",
            "time_ago": p.created_at.strftime("%d/%m/%Y %H:%M"),
            "text": p.text,
            "media": p.media,
            "is_video": p.is_video,
            "tags": [t.name for t in p.tags.all()],
            "likes": p.likes_count,
            "comments": p.comments_count,
            "is_liked": p.likes.filter(user=request.user).exists() if request.user.is_authenticated else False,
        })

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


def search_view(request):
    query = request.GET.get('q', '').strip()
    tag_query = query.lstrip('#')

    posts_results = []
    people_results = []
    tags_results = []

    if query:
        # 1. Search Posts
        matching_posts = Post.objects.filter(
            Q(text__icontains=query) | Q(tags__name__icontains=tag_query)
        ).distinct().order_by('-created_at').select_related('author', 'author__userprofile').prefetch_related('tags', 'likes', 'comments').annotate(
            likes_count=Count('likes', distinct=True),
            comments_count=Count('comments', distinct=True)
        )

        for p in matching_posts:
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
            if request.user.is_authenticated:
                is_liked = p.likes.filter(user=request.user).exists()

            posts_results.append({
                "post_id": p.id,
                "author": display_author,
                "author_username": p.author.username,
                "author_avatar": avatar_url,
                "location": user_location,
                "time_ago": p.created_at.strftime("%d/%m/%Y %H:%M"),
                "text": p.text,
                "media": p.media,
                "is_video": p.is_video,
                "tags": [t.name for t in p.tags.all()],
                "likes": p.likes_count,
                "comments": p.comments_count,
                "is_liked": is_liked,
            })

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
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            auth_login(request, user)
            return redirect("feed")
        error = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"

    return render(request, "sskapp/login.html", {"error": error})


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