ALTER TABLE results
ADD COLUMN total_marks INTEGER,
ADD COLUMN percentage FLOAT,
ADD COLUMN status VARCHAR(20),
ADD COLUMN time_taken_seconds INTEGER;
