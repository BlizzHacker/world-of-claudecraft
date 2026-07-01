FROM mediawiki:1.43

COPY mediawiki/apache-wiki.conf /etc/apache2/conf-enabled/wiki-path.conf
COPY mediawiki/entrypoint.sh /usr/local/bin/woc-mediawiki-entrypoint
COPY mediawiki/LocalSettings.php /opt/woc/LocalSettings.php
COPY mediawiki/seed/pages.xml /opt/woc/seed/pages.xml
COPY mediawiki/theme/Common.css /var/www/html/resources/assets/woc-mediawiki.css
COPY public/loading-screen.jpg /var/www/html/resources/assets/woc-loading-screen.jpg
# Cryptic Realm branding (the upstream woc_* logos don't exist in this fork).
# Destination filenames kept stable so LocalSettings.php / Common.css refs hold.
COPY public/cr_logo_square.webp /var/www/html/resources/assets/woc-logo-square.webp
COPY public/cryptic-realm-logo-512.png /var/www/html/resources/assets/cryptic-realm-logo.png

RUN chmod +x /usr/local/bin/woc-mediawiki-entrypoint

ENTRYPOINT ["woc-mediawiki-entrypoint"]
CMD ["apache2-foreground"]
