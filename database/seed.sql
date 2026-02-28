CREATE DATABASE IF NOT EXISTS cinema_ebooking;
USE cinema_ebooking;

CREATE TABLE IF NOT EXISTS movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500),
    genre VARCHAR(50),
    rating VARCHAR(10),
    description TEXT,
    poster VARCHAR(500),
    trailer VARCHAR(500),
    status ENUM('Now Playing', 'Coming Soon'),
    release_date DATE
);

INSERT INTO movies (title, genre, rating, description, poster, trailer, status, release_date) VALUES
('I Can Only Imagine 2', 'Drama', 'PG', 'After the breakout success of the song I Can Only Imagine, MercyMe\'s Bart Millard is living the dream with sold-out arenas, a devoted fan base, and a thriving career. However, Millard\'s past soon threatens the family he\'s built, especially the fragile bond with his son, Sam.', 'images/ICanOnlyImagine2.jpg', 'https://www.youtube.com/embed/m4M6Vi4Uc04', 'Now Playing', '2026-02-20'),
('Zootopia 2', 'Animation', 'PG', 'Rookie cops Judy Hopps and Nick Wilde find themselves on the twisting trail of a great mystery when Gary De\'Snake arrives in Zootropolis and turns the animal metropolis upside down. To crack the case, Judy and Nick must go undercover to unexpected new parts of town, where their growing partnership is tested like never before.', 'images/Zootopia.jpg', 'https://www.youtube.com/embed/BjkIOU5PhyQ', 'Now Playing', '2025-11-26'),
('Solo Mio', 'Comedy', 'PG', 'A wedding disaster leaves a groom stranded in Rome, heartbroken in the world\'s happiest city. However, with help from a determined local and a few meddling couples, his ruined honeymoon becomes an adventure that he never expected.', 'images/solomio.jpg', 'https://www.youtube.com/embed/hvTpQDdZY0k', 'Now Playing', '2026-02-26'),
('This Is Not a Test', 'Horror', 'R', 'Sloane and a small group of her classmates take cover in their high school to escape the apocalypse. As danger relentlessly pounds on the doors, she begins to see the world through the eyes of people who actually want to live.', 'images/thisisnotatest.jpg', 'https://www.youtube.com/embed/DXAjPhglafE', 'Now Playing', '2026-02-20'),
('Wuthering Heights', 'Romance', 'R', 'Tragedy strikes when Heathcliff falls in love with Catherine Earnshaw, a woman from a wealthy family in 18th-century England.', 'images/wutheringheights.png', 'https://www.youtube.com/embed/3fLCdIYShEQ', 'Now Playing', '2026-02-13'),
('Send Help', 'Horror', 'R', 'A woman and her overbearing boss become stranded on a deserted island after a plane crash. They must overcome past grievances and work together to survive, but ultimately, it\'s a battle of wills and wits to make it out alive.', 'images/sendhelp.jpg', 'https://www.youtube.com/embed/R4wiXj9NmEE', 'Now Playing', '2026-01-30'),
('Undertone', 'Horror', 'R', 'A podcast host covering spooky content moves in to care for her dying mother. When sent recordings of a pregnant couple\'s paranormal encounters, she discovers their story parallels hers, each tape pushing her toward madness.', 'images/undertone.jpg', 'https://www.youtube.com/embed/j6uDeBYDHu4', 'Coming Soon', '2026-03-13'),
('Reminders of Him', 'Romance', 'PG-13', 'After prison, a woman attempts to reconnect with her young daughter but faces resistance from everyone except a bar owner with ties to her child. As they grow closer, she must confront her past mistakes to build a hopeful future.', 'images/remindersofhim.jpg', 'https://www.youtube.com/embed/i36Zw32GfRQ', 'Coming Soon', '2026-03-06'),
('Hoppers', 'Animation', 'PG', 'When scientists discover a way to transform human consciousness into robotic animals, Mabel uses the new technology to uncover mysteries of the animal world that are beyond anything she could have ever imagined.', 'images/hoppers.jpg', 'https://www.youtube.com/embed/hJnAHzo4-KI', 'Coming Soon', '2024-03-22'),
('Ready or Not 2: Here I Come', 'Horror', 'R', 'After surviving an all-out attack from the Le Domas family, Grace discovers she\'s reached the next level of the nightmarish game, and this time with her estranged sister, Faith, by her side. To survive, Grace must keep Faith alive and claim the High Seat of the Council that controls the world. Four rival families are also hunting her for the throne, and whoever wins will rule it all.', 'images/readyornot2.jpg', 'https://www.youtube.com/embed/7K3sNRm8J0w', 'Coming Soon', '2026-03-20');
