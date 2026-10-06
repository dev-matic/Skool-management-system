CREATE TABLE "bell_schedule" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bell_schedule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"term_id" bigint NOT NULL,
	"name" text NOT NULL,
	"days" smallint[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bell_schedule_school_id_id_key" UNIQUE("school_id","id"),
	CONSTRAINT "bell_schedule_school_term_id_key" UNIQUE("school_id","term_id","id"),
	CONSTRAINT "bell_schedule_days_valid" CHECK (cardinality("bell_schedule"."days") >= 1 AND "bell_schedule"."days" <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);
--> statement-breakpoint
CREATE TABLE "bell_schedule_stage" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bell_schedule_stage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"term_id" bigint NOT NULL,
	"stage" "stage" NOT NULL,
	"bell_schedule_id" bigint NOT NULL,
	CONSTRAINT "bell_schedule_stage_term_stage_key" UNIQUE("term_id","stage")
);
--> statement-breakpoint
CREATE TABLE "period" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "period_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"bell_schedule_id" bigint NOT NULL,
	"sort_order" integer NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "period_school_id_id_key" UNIQUE("school_id","id"),
	CONSTRAINT "period_kind_valid" CHECK ("period"."kind" IN ('lesson', 'break')),
	CONSTRAINT "period_times" CHECK ("period"."ends_at" > "period"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "room_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"name" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_school_id_id_key" UNIQUE("school_id","id")
);
--> statement-breakpoint
CREATE TABLE "timetable_entry" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "timetable_entry_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"term_id" bigint NOT NULL,
	"class_group_id" bigint NOT NULL,
	"period_id" bigint NOT NULL,
	"day" smallint NOT NULL,
	"subject_id" bigint NOT NULL,
	"teacher_id" text,
	"room_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_entry_class_slot_key" UNIQUE("class_group_id","period_id","day"),
	CONSTRAINT "timetable_entry_day_valid" CHECK ("timetable_entry"."day" BETWEEN 1 AND 7)
);
--> statement-breakpoint
ALTER TABLE "bell_schedule" ADD CONSTRAINT "bell_schedule_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bell_schedule" ADD CONSTRAINT "bell_schedule_term_fk" FOREIGN KEY ("school_id","term_id") REFERENCES "public"."term"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bell_schedule_stage" ADD CONSTRAINT "bell_schedule_stage_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bell_schedule_stage" ADD CONSTRAINT "bell_schedule_stage_schedule_fk" FOREIGN KEY ("school_id","term_id","bell_schedule_id") REFERENCES "public"."bell_schedule"("school_id","term_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period" ADD CONSTRAINT "period_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "period" ADD CONSTRAINT "period_bell_schedule_fk" FOREIGN KEY ("school_id","bell_schedule_id") REFERENCES "public"."bell_schedule"("school_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_term_fk" FOREIGN KEY ("school_id","term_id") REFERENCES "public"."term"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_class_group_fk" FOREIGN KEY ("school_id","class_group_id") REFERENCES "public"."class_group"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_period_fk" FOREIGN KEY ("school_id","period_id") REFERENCES "public"."period"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_subject_fk" FOREIGN KEY ("school_id","subject_id") REFERENCES "public"."subject"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_room_fk" FOREIGN KEY ("school_id","room_id") REFERENCES "public"."room"("school_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bell_schedule_term_name_key" ON "bell_schedule" USING btree ("term_id",lower("name"));--> statement-breakpoint
CREATE INDEX "period_bell_schedule_idx" ON "period" USING btree ("bell_schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "room_school_name_key" ON "room" USING btree ("school_id",lower("name"));--> statement-breakpoint
CREATE INDEX "timetable_entry_term_teacher_idx" ON "timetable_entry" USING btree ("term_id","teacher_id");--> statement-breakpoint
CREATE INDEX "timetable_entry_term_room_idx" ON "timetable_entry" USING btree ("term_id","room_id");