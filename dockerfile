
#
# Local Cloud Sparc-Server  
#

#
# based on Alpine Node (version 8 is tested, other Version should work as well)
#
FROM mhart/alpine-node:7

RUN apk add --no-cache git

# create the Working Directory
RUN mkdir -p /usr/src/localCloud
RUN mkdir -p /usr/src/localCloud/spark-rabbit
WORKDIR /usr/src/localCloud/spark-rabbit

COPY ./package.json /usr/src/localCloud/spark-rabbit

RUN npm install

COPY ./dist/* /usr/src/localCloud/spark-rabbit/dist/
COPY ./dist/lib/* /usr/src/localCloud/spark-rabbit/dist/lib/
COPY ./firmware/*.bin /usr/src/localCloud/spark-rabbit/firmware/

WORKDIR /usr/src/localCloud/spark-rabbit

# Expose SparkPort to be mapped
EXPOSE 5683

# Expose ServerPort for API
EXPOSE 8080

# Expose DataDirectory to store DB and Device Keys 
VOLUME /usr/src/localCloud/spark-rabbit/data

ENTRYPOINT ["node", "./dist/main"]
#ENTRYPOINT ["/bin/sh"]
