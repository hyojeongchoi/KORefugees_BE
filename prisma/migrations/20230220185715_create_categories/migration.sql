-- CreateTable
CREATE TABLE `Users` (
    `userId` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(50) NOT NULL,
    `password` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `age` INTEGER NULL,
    `gender` VARCHAR(10) NOT NULL,
    `type` ENUM('refugee', 'expert') NOT NULL,
    `status` VARCHAR(10) NULL,
    `nation` VARCHAR(20) NULL,
    `koreanLevel` ENUM('Advanced', 'Intermediate', 'Bigin') NULL,
    `profileImagePath` VARCHAR(200) NULL,
    `talent` VARCHAR(50) NULL,

    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
