-- HouseFolder entity and HouseFile.folder were added (folder tree browsing/creation/
-- recursive delete) on a branch that predated V1__baseline.sql, so neither ever got a
-- migration - Hibernate's old ddl-auto=update masked the gap until ddl-auto=validate
-- started enforcing it against the real schema.

create table house_folders (
    id uuid not null,
    household_id uuid not null,
    parent_folder_id uuid,
    name varchar(255) not null,
    created_by uuid,
    created_at timestamp(6) with time zone not null,
    primary key (id),
    constraint fk_house_folders_household foreign key (household_id) references households (id),
    constraint fk_house_folders_parent foreign key (parent_folder_id) references house_folders (id),
    constraint fk_house_folders_created_by foreign key (created_by) references users (id)
);

alter table house_files add column folder_id uuid;
alter table house_files add constraint fk_house_files_folder foreign key (folder_id) references house_folders (id);
