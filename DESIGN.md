# Bestiary design contract
North star: A painter's cabinet after dark, lit by six impossible portraits.
Theme: dark. Audience: people exploring a playful generative art collection.

Colours: Void #141714 page; Cellar #1b1f1b inputs; Stone #252a24 raised; Hairline #394037 borders; Iron #525c50 inactive; Ash #788174 quiet; Fog #a0a899 secondary; Bone #d1d4c8 body; Paper #f0efdf titles and primary action; Celadon #c3d6a5 selected and focus only. Artwork owns saturated colours.
Surfaces: Void level 0, Cellar level 1, Paper portrait mats level 2. Elevation: physical portrait cards have dark shadows; controls have hairline borders.
Typography: Newsreader/Georgia display 400 and italic; Inter/system sans body; JetBrains Mono/Consolas metadata with tnum and zero. Type scale: 10 metadata / 12 caption / 14 body / 16 controls / 36 brand / 42 dialog / 52 result / 80 headline. Body leading 1.6, titles 1.04; title tracking -.04em, metadata .12em.
Spacing: 4px base; 8px element gap; 12px card padding; 32px section gap; 1240px max width. Radii: 2px cards, 8px controls/dialog, 9999px badges.
Layout: centered headline, horizontal portrait rail around a random invitation, name field underneath. Result art alongside catalogue; stacked on mobile.
Imagery: six supplied painting studies recomposed deterministically through animal-head patches and torn fragments. No screenshot UI. Credit the source artist and distinguish independent remixes from new work by that artist.
Components: masthead, portrait rail, random invitation, name form, photo seed, artwork, catalogue, download/share/save, native cabinet and about dialogs, live status, provenance footer.
Do: prioritise artwork size; keep direct lookup; stable seeds; visible collage seams; legible labels; keyboard/touch support; honest provenance.
Don't: flat cartoon art; fabricated rarity; bright decorative chrome; implementation slogans in discovery; continuous motion; stretched canvases; claims of infinite species.
Motion: 160ms CSS transform/opacity feedback, cubic-bezier(.23,1,.32,1); fine pointer hover only; reduced motion removes movement.
