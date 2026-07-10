from django.urls import (
    re_path,
)

from .consumers import (
    SignalingConsumer,
)


websocket_urlpatterns = [

    re_path(
        r"^ws/signaling/meetings/"
        r"(?P<meeting_code>[a-zA-Z0-9_-]+)/$",
        SignalingConsumer.as_asgi(),
    ),

]