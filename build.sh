set -e

tsc

docker build -f dockerfile -t keatec/spark-rabbit:nightly .

#docker rm $(docker ps -q -f status=exited) & docker rmi $(docker images -f "dangling=true" -q)

docker stop sparkserver

docker rm sparkserver

docker run -e "LOG_LEVEL=debug" -p 8100:8080 -p 5683:5683 --volume /localStore/data:/usr/src/localCloud/spark-rabbit/data -d --name sparkserver --hostname sparkserver keatec/spark-rabbit:nightly

#docker rm $(docker ps -q -f status=exited) & docker rmi $(docker images -f "dangling=true" -q)

docker logs --follow sparkserver | bunyan -o short