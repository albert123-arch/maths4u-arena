# Advertising deployment files

Updated 18 October 2026.

The canonical publisher is `pub-8460068132661870`. The authoritative approved
seller declaration is served by the root domain at https://maths4u.sbs/ads.txt.
This repository also tracks `public/ads.txt` with the identical declaration so
the Arena subdomain will serve a real text file after its next ordinary release.
Previously the deployed Arena URL returned an HTML fallback rather than ads.txt.

Next.js serves `public/ads.txt` as `/ads.txt`. The existing Hostinger build copies
`public` into `.next/standalone/public`, then into `dist/public`. Keep this file
in source control; editing only the generated build or the live server is not
persistent. A build does not need any secret or additional dependency for it.

This change does not add ad scripts or placements to Arena's lessons, tests or
student dashboards. The six separately deployed apps (EN/TR/ES/DE Word Trail,
Multiply Island and Opening Lab) have their own disabled post-lesson integration
in `D:\www\Noch\Maths4UApps\hosting\advertising`. They are not copied into
Arena's public folder. The root PHP project and all their subdomain folders must
remain separate from Arena's Node.js hbuilds/public_html deployment.

AdSense for maths4u.sbs is still under review. App config flags remain false,
Auto ads stays OFF, and advertising consent/CMP and privacy disclosures must
be prepared before any activation. No live advertising was enabled here.

Local source and any pre-existing generated Arena public folders were updated.
Arena was not rebuilt, pushed or deployed in this synchronization; its running
application, private storage and database were unchanged. The next normal
source build will include this file automatically.
