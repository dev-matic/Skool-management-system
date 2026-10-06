CREATE TYPE "public"."stage" AS ENUM('kg', 'primary', 'jhs', 'shs');--> statement-breakpoint
CREATE TABLE "academic_year" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "academic_year_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_year_school_id_id_key" UNIQUE("school_id","id"),
	CONSTRAINT "academic_year_school_name_key" UNIQUE("school_id","name"),
	CONSTRAINT "academic_year_name_format" CHECK ("academic_year"."name" ~ '^[0-9]{4}/[0-9]{4}$'),
	CONSTRAINT "academic_year_dates" CHECK ("academic_year"."ends_on" > "academic_year"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "class_group" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "class_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"grade_level_id" bigint NOT NULL,
	"name" text NOT NULL,
	"class_teacher_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_group_school_id_id_key" UNIQUE("school_id","id"),
	CONSTRAINT "class_group_year_name_key" UNIQUE("academic_year_id","name")
);
--> statement-breakpoint
CREATE TABLE "class_subject" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "class_subject_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"class_group_id" bigint NOT NULL,
	"subject_id" bigint NOT NULL,
	"teacher_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_subject_class_subject_key" UNIQUE("class_group_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "grade_level" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grade_level_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"name" text NOT NULL,
	"stage" "stage" NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grade_level_school_id_id_key" UNIQUE("school_id","id"),
	CONSTRAINT "grade_level_school_name_key" UNIQUE("school_id","name")
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subject_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_school_id_id_key" UNIQUE("school_id","id")
);
--> statement-breakpoint
CREATE TABLE "term" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "term_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"number" smallint NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_school_id_id_key" UNIQUE("school_id","id"),
	CONSTRAINT "term_year_number_key" UNIQUE("academic_year_id","number"),
	CONSTRAINT "term_number_range" CHECK ("term"."number" BETWEEN 1 AND 6),
	CONSTRAINT "term_dates" CHECK ("term"."ends_on" > "term"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "academic_year" ADD CONSTRAINT "academic_year_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_class_teacher_id_user_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_academic_year_fk" FOREIGN KEY ("school_id","academic_year_id") REFERENCES "public"."academic_year"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_grade_level_fk" FOREIGN KEY ("school_id","grade_level_id") REFERENCES "public"."grade_level"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_class_group_fk" FOREIGN KEY ("school_id","class_group_id") REFERENCES "public"."class_group"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_subject_fk" FOREIGN KEY ("school_id","subject_id") REFERENCES "public"."subject"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_level" ADD CONSTRAINT "grade_level_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term" ADD CONSTRAINT "term_academic_year_fk" FOREIGN KEY ("school_id","academic_year_id") REFERENCES "public"."academic_year"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_group_teacher_idx" ON "class_group" USING btree ("class_teacher_id");--> statement-breakpoint
CREATE INDEX "class_subject_teacher_idx" ON "class_subject" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_school_name_key" ON "subject" USING btree ("school_id",lower("name"));