FROM debian:stable-slim

# Install chrome driver
RUN apt update -y && apt clean -y
RUN apt install gnupg -y
ENV CHROME_VERSION "google-chrome-stable"
RUN sed -i -- 's&deb http://deb.debian.org/debian jessie-updates main&#deb http://deb.debian.org/debian jessie-updates main&g' /etc/apt/sources.list \
  && apt-get update && apt-get install wget -y
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list \
  && apt-get update && apt-get -qqy install ${CHROME_VERSION:-google-chrome-stable}

# Install firefox driver
RUN apt update && apt install wget curl bzip2 -y
RUN apt-get remove iceweasel
ENV FILENAME "firefox-latest.tar.bz2"
RUN wget -O $FILENAME --content-disposition "https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=en-US" \
  && apt install bzip2
RUN tar -jxf $FILENAME -C /opt/
RUN ln -sf /opt/firefox/firefox  /usr/bin/firefox
RUN rm $FILENAME
# Taken from: https://medium.com/@cloverinks/how-to-fix-puppetteer-error-ibx11-xcb-so-1-on-ubuntu-152c336368
RUN apt install libgtk-3-0 libx11-6 libx11-xcb1 libdbus-glib-1-2 xdg-utils -y
RUN apt clean

#ARG FIREFOX_VERSION=55.0.3
#RUN apt update -qqy

#RUN echo "deb http://packages.linuxmint.com debian import" >> /etc/apt/sources.list
#RUN apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
#RUN echo "deb https://apt.dockerproject.org/repo ubuntu-trusty main" > /etc/apt/sources.list.d/docker.list
#RUN apt update -y --allow-insecure-repositories

#RUN echo "deb http://ftp.us.debian.org/debian/ sid main" >> /etc/apt/sources.list \
#   && echo "deb-src http://ftp.us.debian.org/debian/ sid main" >> /etc/apt/sources.list
#RUN apt update -qqy
#RUN apt install firefox -y
#RUN apt install libpci-dev -y
#RUN apt install libegl-dev -y

#ARG FIREFOX_VERSION=latest
#RUN FIREFOX_DOWNLOAD_URL=$(if [ $FIREFOX_VERSION = "latest" ] || [ $FIREFOX_VERSION = "nightly-latest" ] || [ $FIREFOX_VERSION = "devedition-latest" ] || [ $FIREFOX_VERSION = "esr-latest" ]; then echo "https://download.mozilla.org/?product=firefox-$FIREFOX_VERSION-ssl&os=linux64&lang=en-US"; else echo "https://download-installer.cdn.mozilla.net/pub/firefox/releases/$FIREFOX_VERSION/linux-x86_64/en-US/firefox-$FIREFOX_VERSION.tar.bz2"; fi) \
#  && apt-get update -qqy \
#  && apt-get -qqy --no-install-recommends install firefox libavcodec-extra \
#  && rm -rf /var/lib/apt/lists/* /var/cache/apt/* \
#  && wget --no-verbose -O /tmp/firefox.tar.bz2 $FIREFOX_DOWNLOAD_URL \
#  && apt-get -y purge firefox \
#  && rm -rf /opt/firefox \
#  && tar -C /opt -xjf /tmp/firefox.tar.bz2 \
#  && rm /tmp/firefox.tar.bz2 \
#  && mv /opt/firefox /opt/firefox-$FIREFOX_VERSION \
#  && ln -fs /opt/firefox-$FIREFOX_VERSION/firefox /usr/bin/firefox

#RUN apt --no-install-recommends -y install firefox
#RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/* \
#  && wget --no-verbose -O /tmp/firefox.tar.bz2 https://download-installer.cdn.mozilla.net/pub/firefox/releases/$FIREFOX_VERSION/linux-x86_64/en-US/firefox-$FIREFOX_VERSION.tar.bz2 \
#  && apt -y purge firefox \
#  && rm -rf /opt/firefox \
#  && tar -C /opt -xjf /tmp/firefox.tar.bz2 \
#  && rm /tmp/firefox.tar.bz2 \
#  && mv /opt/firefox /opt/firefox-$FIREFOX_VERSION \
#  && ln -fs /opt/firefox-$FIREFOX_VERSION/firefox /usr/bin/firefox

# Install deno
RUN apt install curl unzip -y
RUN curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/usr/local sh
RUN export DENO_INSTALL="/root/.local"
RUN export PATH="$DENO_INSTALL/bin:$PATH"