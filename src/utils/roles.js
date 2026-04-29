// src/utils/roles.js

export const ROLE = {
  MEMBER: "member",
  SYSTEM_ADMIN: "system_admin",
  TOURNAMENT_ADMIN: "tournament_admin",
  APPLICATION_ADMIN: "application_admin",
};

export const ROLE_LABEL = {
  [ROLE.MEMBER]: "会員",
  [ROLE.SYSTEM_ADMIN]: "システム管理者",
  [ROLE.TOURNAMENT_ADMIN]: "大会管理者",
  [ROLE.APPLICATION_ADMIN]: "申し込み管理者",
};