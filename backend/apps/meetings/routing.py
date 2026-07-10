from django.urls import (
    re_path,
)

from .consumers import (
    MeetingConsumer,
)


websocket_urlpatterns = [

    re_path(
        r"^ws/meetings/"
        r"(?P<meeting_code>[a-zA-Z0-9_-]+)/$",
        MeetingConsumer.as_asgi(),
    ),

]