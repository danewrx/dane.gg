-- Move the homepage 88x31 top-row buttons from code into the database.
-- Only seeds an empty table, so re-running never duplicates rows.
INSERT INTO "website"."button_links" ("title", "link_url", "image_url", "display_order")
SELECT v.title, v.link_url, v.image_url, v.display_order
FROM (VALUES
	('Dimden', 'https://dimden.dev/', 'https://dimden.dev/services/images/88x31.gif', 0),
	('Melankorin', 'https://melankorin.net/', 'https://melankorin.net/assets/img/buttons/button-1.gif', 1),
	('Jesx', 'https://anemoia.moe', 'https://anemoia.moe/images/buttons/footer/jesx.gif', 2),
	('Docodemo', 'https://dokode.moe', 'https://dokode.moe/media/88x31sites/dokodemobutton3.gif', 3),
	('Nichind', 'https://nichind.dev', 'https://nichind.dev/88x31.gif', 4),
	('NekoWeb', 'https://nekoweb.org/', 'https://nekoweb.org/assets/buttons/button6.gif', 5),
	('hrtowii', 'https://hrtowii.nekoweb.org/', 'https://hrtowii.nekoweb.org/88x31-madoka.png', 6),
	('h4rl', 'https://h4rl.dev/', '/uploads/button-h4rl.png', 7),
	('Luniiya', 'https://luniiya.me/', 'https://luniiya.me/button.gif', 8)
) AS v(title, link_url, image_url, display_order)
WHERE NOT EXISTS (SELECT 1 FROM "website"."button_links");
