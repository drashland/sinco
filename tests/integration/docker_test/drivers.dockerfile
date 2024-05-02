FROM debian:stable-slim

ENV CHROME_VERSION "124.0.6367.119"

# Install chrome driver
RUN apt update -y \
  && apt-get upgrade -y \
  && apt clean -y \
  && apt-get install wget -y \
  && wget http://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}-1_amd64.deb \
  && apt-get install -y ./google-chrome-stable_${CHROME_VERSION}-1_amd64.deb

# 2nd method of doing it:
# RUN sed -i -- 's&deb http://deb.debian.org/debian jessie-updates main&#deb http://deb.debian.org/debian jessie-updates main&g' /etc/apt/sources.list \
#   && apt-get update && apt-get install wget -y
# RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#   && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list \
#   && apt-get update && apt-get -qqy install google-chrome-stable

# Install firefox driver
# RUN apt update && apt install wget curl bzip2 -y
# RUN apt-get remove iceweasel
# ENV FILENAME "firefox-latest.tar.bz2"
# RUN wget -O $FILENAME --content-disposition "https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=en-US" \
#   && apt install bzip2
# RUN tar -jxf $FILENAME -C /opt/
# RUN ln -sf /opt/firefox/firefox  /usr/bin/firefox
# RUN rm $FILENAME
# Taken from: https://medium.com/@cloverinks/how-to-fix-puppetteer-error-ibx11-xcb-so-1-on-ubuntu-152c336368
# RUN apt install libgtk-3-0 libx11-6 libx11-xcb1 libdbus-glib-1-2 xdg-utils -y
# RUN apt clean

# Install deno
RUN apt install curl unzip -y \
  && curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/usr/local sh \
  && export DENO_INSTALL="/root/.local" \
  && export PATH="$DENO_INSTALL/bin:$PATH"