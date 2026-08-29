from django.urls import path

from . import views
from .views import health_check_view


urlpatterns = [

    path(
        "",
        views.login_view,
        name="home",
    ),

    path(
        "register/",
        views.register_view,
        name="register",
    ),

    path(
        "login/",
        views.login_view,
        name="login",
    ),

    path(
        "logout/",
        views.logout_view,
        name="logout",
    ),

    path(
        "dashboard/",
        views.dashboard_view,
        name="dashboard",
    ),

    path(
        "health/",
        health_check_view,
        name="health_check",
    ),

]