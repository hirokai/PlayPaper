# Users schema

# --- !Ups

CREATE TABLE {Paper} (
    paper_id int IDENTITY(1000,1),
    url text NOT NULL,
    doi text,
    title text,
    year SMALLINT,
    journal text,
    page_from text,
    page_to text,
    authors text,
    volume text,
    added text,
    html text,
    abs text,
    main text,
    availability text NOT NULL
  );

CREATE TABLE {User} (
    email text NOT NULL,
    first_name text,
    last_name text
);

# --- !Downs

DROP TABLE User;
DROP TABLE Paper;