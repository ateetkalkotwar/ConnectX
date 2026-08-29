from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.meetings.models import Meeting

from .forms import LoginForm, RegisterForm


def register_view(request):

    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":

        form = RegisterForm(
            request.POST,
            request.FILES
        )

        if form.is_valid():

            user = form.save()

            login(
                request,
                user
            )

            return redirect("dashboard")

    else:

        form = RegisterForm()

    return render(
        request,
        "accounts/register.html",
        {
            "form": form
        }
    )


def login_view(request):

    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":

        form = LoginForm(request.POST)

        if form.is_valid():

            username = form.cleaned_data["username"]

            password = form.cleaned_data["password"]

            remember_me = form.cleaned_data["remember_me"]

            user = authenticate(
                request,
                username=username,
                password=password
            )

            if user is not None:

                login(
                    request,
                    user
                )

                if remember_me:

                    request.session.set_expiry(
                        60 * 60 * 24 * 30
                    )

                else:

                    request.session.set_expiry(0)

                return redirect("dashboard")

            form.add_error(
                None,
                "Invalid username or password."
            )

    else:

        form = LoginForm()

    return render(
        request,
        "accounts/login.html",
        {
            "form": form
        }
    )


@login_required
@require_POST
def logout_view(request):

    logout(request)

    return redirect("login")


@login_required
def dashboard_view(
    request,
):

    now = timezone.now()


    user_meetings = (
        Meeting.objects
        .filter(
            Q(
                host=request.user
            )
            |
            Q(
                participants__user=request.user
            )
        )
        .distinct()
    )


    upcoming_meetings = (
        user_meetings
        .filter(
            status=Meeting.MeetingStatus.SCHEDULED,
            scheduled_at__isnull=False,
            scheduled_at__gte=now,
        )
        .order_by(
            "scheduled_at",
        )[:5]
    )


    recent_meetings = (
        user_meetings
        .filter(
            status=Meeting.MeetingStatus.ENDED,
        )
        .order_by(
            "-ended_at",
        )[:5]
    )


    return render(
        request,
        "accounts/dashboard.html",
        {
            "upcoming_meetings":
                upcoming_meetings,

            "recent_meetings":
                recent_meetings,

            "meeting_count":
                user_meetings.count(),
        },
    )




from django.http import JsonResponse


def health_check_view(
    request,
):

    return JsonResponse(
        {
            "status": "ok",
        }
    )