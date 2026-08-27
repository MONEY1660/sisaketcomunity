from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.shortcuts import redirect, render

# ---------------------------------------------------------------------------
# NOTE: This is the frontend/design pass. The feed below uses sample data so
# the layout can be reviewed end-to-end; wiring it to a real Post model
# (with saved text/media/tags) is the next backend step.
# ---------------------------------------------------------------------------

SAMPLE_POSTS = [
    {
        "author": "น้ำฝน จากกันทรลักษ์",
        "location": "อ.กันทรลักษ์",
        "time_ago": "2 ชั่วโมงที่แล้ว",
        "text": "เช้านี้ไปเก็บทุเรียนภูเขาไฟที่สวนตากับพ่อ ปีนี้ลูกดกมาก หอมไปทั้งสวนเลยค่ะ 🌾",
        "media_type": "image",
        "media_caption": "สวนทุเรียนภูเขาไฟ กันทรลักษ์",
        "tags": ["ทุเรียนภูเขาไฟ", "กันทรลักษ์", "เกษตรกรรม"],
        "likes": 128,
        "comments": 24,
    },
    {
        "author": "ทีมเที่ยวศรีสะเกษ",
        "location": "อ.กันทรลักษ์",
        "time_ago": "5 ชั่วโมงที่แล้ว",
        "text": "วิวพระอาทิตย์ขึ้นที่ผามออีแดง มองเห็นปราสาทเขาพระวิหารชัดมาก ใครไปช่วงนี้บอกเลยว่าคุ้มตื่นเช้าสุด ๆ",
        "media_type": "video",
        "media_caption": "ผามออีแดง ยามเช้า",
        "tags": ["เขาพระวิหาร", "ท่องเที่ยว", "ผามออีแดง"],
        "likes": 342,
        "comments": 51,
    },
    {
        "author": "ครูอ้อย สอนภาษาไทย",
        "location": "อ.เมืองศรีสะเกษ",
        "time_ago": "1 วันที่แล้ว",
        "text": "ปีนี้งานเทศกาลดอกลำดวนบานจัดยิ่งใหญ่อีกแล้ว พาลูกศิษย์ไปชมขบวนแห่ สนุกและอบอุ่นมากค่ะ",
        "media_type": None,
        "media_caption": "",
        "tags": ["งานเทศกาล", "เมืองศรีสะเกษ", "ดอกลำดวน"],
        "likes": 76,
        "comments": 9,
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
    return {
        "user_authenticated": request.user.is_authenticated,
        "display_name": request.user.get_username() if request.user.is_authenticated else None,
    }


def index(request):
    return redirect("feed")


def feed(request):
    context = {
        "posts": SAMPLE_POSTS,
        "trending_tags": TRENDING_TAGS,
        "active_places": ACTIVE_PLACES,
    }
    context.update(_auth_context(request))
    return render(request, "sskapp/feed.html", context)


def create_post(request):
    if request.method == "POST":
        # Frontend/design pass: acknowledge submission and return to feed.
        # Saving text/media/tags to a Post model is the next backend step.
        return redirect("feed")

    context = _auth_context(request)
    return render(request, "sskapp/create_post.html", context)


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
            auth_login(request, user)
            return redirect("feed")

    return render(request, "sskapp/register.html", {"error": error})


def logout_view(request):
    if request.method == "POST":
        auth_logout(request)
        return redirect("feed")

    context = _auth_context(request)
    return render(request, "sskapp/logout.html", context)
