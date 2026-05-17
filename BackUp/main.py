import os
import subprocess
import zipfile
from datetime import datetime, timezone, timedelta

from flask import Flask, send_file, jsonify, request

app = Flask(__name__)

JST = timezone(timedelta(hours=9))


@app.route("/", methods=["GET"])
def backup():
    expected_token = os.environ.get("BACKUP_TOKEN")

    if expected_token:
        token = request.args.get("token")
        if token != expected_token:
            return jsonify({"error": "unauthorized"}), 401

    db_url = os.environ["SUPABASE_DATABASE_URL"]
    now = datetime.now(JST).strftime("%Y%m%d_%H%M%S")

    public_pre_schema = f"/tmp/public_pre_schema_{now}.sql"
    auth_users = f"/tmp/auth_users_{now}.sql"
    auth_identities = f"/tmp/auth_identities_{now}.sql"
    public_data = f"/tmp/public_data_{now}.sql"
    public_post_schema = f"/tmp/public_post_schema_{now}.sql"

    zip_file = f"/tmp/manimani_full_backup_{now}.zip"

    # 1. publicのテーブル・関数など（外部キー制約などは後回し）
    subprocess.run(
        [
            "pg_dump",
            "--schema=public",
            "--section=pre-data",
            "--no-owner",
            "--no-privileges",
            db_url,
            "-f",
            public_pre_schema
        ],
        check=True
    )

    # 2. auth.users
    subprocess.run(
        [
            "pg_dump",
            "--table=auth.users",
            "--data-only",
            "--column-inserts",
            "--no-owner",
            "--no-privileges",
            db_url,
            "-f",
            auth_users
        ],
        check=True
    )

    # 3. auth.identities
    subprocess.run(
        [
            "pg_dump",
            "--table=auth.identities",
            "--data-only",
            "--column-inserts",
            "--no-owner",
            "--no-privileges",
            db_url,
            "-f",
            auth_identities
        ],
        check=True
    )

    # 4. publicのデータ
    subprocess.run(
        [
            "pg_dump",
            "--schema=public",
            "--section=data",
            "--data-only",
            "--column-inserts",
            "--no-owner",
            "--no-privileges",
            db_url,
            "-f",
            public_data
        ],
        check=True
    )

    # 5. publicの制約・RLS・ポリシー・トリガーなど
    subprocess.run(
        [
            "pg_dump",
            "--schema=public",
            "--section=post-data",
            "--no-owner",
            "--no-privileges",
            db_url,
            "-f",
            public_post_schema
        ],
        check=True
    )

    with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(public_pre_schema, arcname=f"01_public_pre_schema_{now}.sql")
        z.write(auth_users, arcname=f"02_auth_users_{now}.sql")
        z.write(auth_identities, arcname=f"03_auth_identities_{now}.sql")
        z.write(public_data, arcname=f"04_public_data_{now}.sql")
        z.write(public_post_schema, arcname=f"05_public_post_schema_{now}.sql")

    return send_file(
        zip_file,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"manimani_full_backup_{now}.zip"
    )