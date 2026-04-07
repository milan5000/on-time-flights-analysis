import redis
from hotqueue import HotQueue

_redis_ip = "172.19.0.1"
_redis_port = 6379

rd = redis.Redis(host=_redis_ip, port=_redis_port, db=0)
q = HotQueue("queue", host=_redis_ip, port=_redis_port, db=1)
jdb = redis.Redis(host=_redis_ip, port=_redis_port, db=2)
