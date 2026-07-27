from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from dotenv import load_dotenv
from urllib.parse import quote_plus
from sqlalchemy import text

import bcrypt
import os
import PyPDF2

from ai_service import analyze_cv_simple, calculate_match_score


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()


# =========================================================
# FLASK APPLICATION
# =========================================================

app = Flask(__name__)


# =========================================================
# CORS
# =========================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

# Multiple allowed origins can be supplied as:
# FRONTEND_URL=https://site.vercel.app,http://localhost:5173

allowed_origins = [
    origin.strip()
    for origin in FRONTEND_URL.split(",")
    if origin.strip()
]

CORS(
    app,
    resources={
        r"/*": {
            "origins": allowed_origins
        }
    }
)


# =========================================================
# DATABASE
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:

    # Production database
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL

else:

    # Local MySQL database

    DB_USER = os.getenv("DB_USER", "root")

    DB_PASSWORD = quote_plus(
        os.getenv("DB_PASSWORD", "")
    )

    DB_HOST = os.getenv(
        "DB_HOST",
        "localhost"
    )

    DB_PORT = os.getenv(
        "DB_PORT",
        "3306"
    )

    DB_NAME = os.getenv(
        "DB_NAME",
        "ai_job_board"
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://"
        f"{DB_USER}:"
        f"{DB_PASSWORD}@"
        f"{DB_HOST}:"
        f"{DB_PORT}/"
        f"{DB_NAME}"
    )


app.config[
    "SQLALCHEMY_TRACK_MODIFICATIONS"
] = False


# Helps serverless database connections
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 280
}


db = SQLAlchemy(app)


# =========================================================
# USER MODEL
# =========================================================

class User(db.Model):

    __tablename__ = "user"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(200),
        nullable=False
    )

    role = db.Column(
        db.String(20),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    cv_text = db.Column(
        db.Text,
        nullable=True
    )


# =========================================================
# JOB MODEL
# =========================================================

class Job(db.Model):

    __tablename__ = "job"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    location = db.Column(
        db.String(100)
    )

    skills = db.Column(
        db.String(500)
    )

    recruiter_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# =========================================================
# APPLICATION MODEL
# =========================================================

class Application(db.Model):

    __tablename__ = "application"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    candidate_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    job_id = db.Column(
        db.Integer,
        db.ForeignKey("job.id"),
        nullable=False
    )

    match_score = db.Column(
        db.Integer,
        default=0
    )

    status = db.Column(
        db.String(50),
        default="pending"
    )

    applied_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "AI Job Board API is running"
    }), 200


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "success": True,
        "status": "healthy"
    }), 200


# =========================================================
# DATABASE TEST
# =========================================================

@app.route("/db-test", methods=["GET"])
def db_test():

    try:

        db.session.execute(
            text("SELECT 1")
        )

        database = db.session.execute(
            text("SELECT DATABASE()")
        ).scalar()

        return jsonify({
            "success": True,
            "message": "Database connected!",
            "database": database
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CREATE TABLES
#
# Development only.
# Do not expose this permanently in production.
# =========================================================

@app.route("/create-db", methods=["GET"])
def create_db():

    # Disable unless explicitly enabled.
    if os.getenv("ALLOW_CREATE_DB") != "true":

        return jsonify({
            "error": "Database creation endpoint disabled"
        }), 403

    try:

        db.create_all()

        return jsonify({
            "success": True,
            "message": "Database tables created"
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# REGISTER
# =========================================================

@app.route("/register", methods=["POST"])
def register():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role")

        if (
            not name
            or not email
            or not password
            or not role
        ):

            return jsonify({
                "error":
                "Name, email, password and role are required"
            }), 400


        name = name.strip()

        email = (
            email
            .strip()
            .lower()
        )

        role = (
            role
            .strip()
            .lower()
        )


        if role not in [
            "candidate",
            "recruiter"
        ]:

            return jsonify({
                "error":
                "Role must be candidate or recruiter"
            }), 400


        existing_user = (
            User.query
            .filter_by(
                email=email
            )
            .first()
        )


        if existing_user:

            return jsonify({
                "error":
                "Email already registered"
            }), 400


        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        )


        user = User(
            name=name,
            email=email,
            password=(
                hashed_password
                .decode("utf-8")
            ),
            role=role
        )


        db.session.add(user)

        db.session.commit()


        return jsonify({
            "message":
            "User registered successfully!",
            "user_id": user.id,
            "name": user.name,
            "role": user.role
        }), 201


    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# LOGIN
# =========================================================

@app.route("/login", methods=["POST"])
def login():

    try:

        data = request.get_json(
            silent=True
        ) or {}


        email = data.get("email")
        password = data.get("password")


        if not email or not password:

            return jsonify({
                "error":
                "Email and password are required"
            }), 400


        email = (
            email
            .strip()
            .lower()
        )


        user = (
            User.query
            .filter_by(
                email=email
            )
            .first()
        )


        if not user:

            return jsonify({
                "error":
                "Email not found"
            }), 404


        password_correct = (
            bcrypt.checkpw(
                password.encode("utf-8"),
                user.password.encode("utf-8")
            )
        )


        if not password_correct:

            return jsonify({
                "error":
                "Wrong password"
            }), 401


        return jsonify({
            "message":
            "Login successful!",
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# CREATE JOB
# =========================================================

@app.route("/create-job", methods=["POST"])
def create_job():

    try:

        data = request.get_json(
            silent=True
        ) or {}


        title = data.get("title")

        description = data.get(
            "description"
        )

        location = data.get(
            "location"
        )

        skills = data.get(
            "skills"
        )

        recruiter_id = data.get(
            "recruiter_id"
        )


        if (
            not title
            or not description
            or not recruiter_id
        ):

            return jsonify({
                "error":
                "Title, description and recruiter_id are required"
            }), 400


        recruiter = db.session.get(
            User,
            recruiter_id
        )


        if not recruiter:

            return jsonify({
                "error":
                "Recruiter not found"
            }), 404


        if recruiter.role != "recruiter":

            return jsonify({
                "error":
                "Only recruiters can create jobs"
            }), 403


        job = Job(
            title=title.strip(),

            description=(
                description.strip()
            ),

            location=(
                location.strip()
                if location
                else None
            ),

            skills=(
                skills.strip()
                if skills
                else None
            ),

            recruiter_id=recruiter_id
        )


        db.session.add(job)

        db.session.commit()


        return jsonify({
            "message":
            "Job created successfully!",
            "job_id": job.id
        }), 201


    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# GET JOBS
# =========================================================

@app.route("/jobs", methods=["GET"])
def get_jobs():

    try:

        jobs = (
            Job.query
            .order_by(
                Job.created_at.desc()
            )
            .all()
        )


        result = []


        for job in jobs:

            recruiter = db.session.get(
                User,
                job.recruiter_id
            )


            result.append({

                "id":
                    job.id,

                "title":
                    job.title,

                "description":
                    job.description,

                "location":
                    job.location,

                "skills":
                    job.skills,

                "recruiter_id":
                    job.recruiter_id,

                "recruiter_name":
                    recruiter.name
                    if recruiter
                    else None,

                "created_at":
                    (
                        job.created_at
                        .strftime("%Y-%m-%d")
                        if job.created_at
                        else None
                    )
            })


        return jsonify(result), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# UPLOAD CV
#
# IMPORTANT:
# We do NOT save the PDF permanently.
# The PDF is read directly from memory.
# =========================================================

@app.route("/upload-cv", methods=["POST"])
def upload_cv():

    try:

        if "file" not in request.files:

            return jsonify({
                "error":
                "No file uploaded"
            }), 400


        file = request.files["file"]

        user_id = request.form.get(
            "user_id"
        )


        if not user_id:

            return jsonify({
                "error":
                "user_id is required"
            }), 400


        try:

            user_id = int(user_id)

        except ValueError:

            return jsonify({
                "error":
                "Invalid user_id"
            }), 400


        user = db.session.get(
            User,
            user_id
        )


        if not user:

            return jsonify({
                "error":
                "User not found"
            }), 404


        if not file.filename:

            return jsonify({
                "error":
                "No file selected"
            }), 400


        if not (
            file.filename
            .lower()
            .endswith(".pdf")
        ):

            return jsonify({
                "error":
                "Only PDF files are allowed"
            }), 400


        # Read directly from uploaded stream.
        # No local uploads directory required.

        try:

            pdf_reader = (
                PyPDF2.PdfReader(
                    file.stream
                )
            )


            cv_text = ""


            for page in pdf_reader.pages:

                extracted_text = (
                    page.extract_text()
                )


                if extracted_text:

                    cv_text += (
                        extracted_text
                        + "\n"
                    )


        except Exception as e:

            print(
                "PDF ERROR:",
                str(e)
            )

            return jsonify({
                "error":
                "Could not read PDF"
            }), 400


        if not cv_text.strip():

            return jsonify({
                "error":
                "No readable text found in PDF"
            }), 400


        user.cv_text = cv_text

        db.session.commit()


        return jsonify({
            "message":
                "CV uploaded successfully!",
            "cv_preview":
                cv_text[:200]
        }), 200


    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# ANALYZE CV
# =========================================================

@app.route(
    "/analyze-cv/<int:user_id>",
    methods=["GET"]
)
def analyze_cv(user_id):

    try:

        user = db.session.get(
            User,
            user_id
        )


        if not user:

            return jsonify({
                "error":
                "User not found"
            }), 404


        if not user.cv_text:

            return jsonify({
                "error":
                "No CV found"
            }), 404


        analysis = analyze_cv_simple(
            user.cv_text
        )


        return jsonify(
            analysis
        ), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# RECOMMENDED JOBS
# =========================================================

@app.route(
    "/recommended-jobs/<int:user_id>",
    methods=["GET"]
)
def recommended_jobs(user_id):

    try:

        user = db.session.get(
            User,
            user_id
        )


        if not user:

            return jsonify({
                "error":
                "User not found"
            }), 404


        if not user.cv_text:

            return jsonify({
                "error":
                "No CV found"
            }), 404


        jobs = Job.query.all()

        matches = []


        for job in jobs:

            score = (
                calculate_match_score(
                    user.cv_text,
                    job.skills or ""
                )
            )


            matches.append({

                "job_id":
                    job.id,

                "title":
                    job.title,

                "description":
                    job.description,

                "location":
                    job.location,

                "skills":
                    job.skills,

                "match_score":
                    score,

                "match_explanation":
                    (
                        f"Your CV has a "
                        f"{score}% match "
                        f"for this job."
                    )
            })


        matches.sort(
            key=lambda item:
                item["match_score"],
            reverse=True
        )


        return jsonify(
            matches
        ), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# APPLY FOR JOB
# =========================================================

@app.route("/apply-job", methods=["POST"])
def apply_job():

    try:

        data = request.get_json(
            silent=True
        ) or {}


        candidate_id = data.get(
            "candidate_id"
        )

        job_id = data.get(
            "job_id"
        )


        if not candidate_id or not job_id:

            return jsonify({
                "error":
                "candidate_id and job_id are required"
            }), 400


        candidate = db.session.get(
            User,
            candidate_id
        )

        job = db.session.get(
            Job,
            job_id
        )


        if not candidate:

            return jsonify({
                "error":
                "Candidate not found"
            }), 404


        if not job:

            return jsonify({
                "error":
                "Job not found"
            }), 404


        if candidate.role != "candidate":

            return jsonify({
                "error":
                "Only candidates can apply"
            }), 403


        existing = (
            Application.query
            .filter_by(
                candidate_id=candidate_id,
                job_id=job_id
            )
            .first()
        )


        if existing:

            return jsonify({
                "error":
                "Already applied to this job"
            }), 400


        match_score = 0


        if candidate.cv_text:

            match_score = (
                calculate_match_score(
                    candidate.cv_text,
                    job.skills or ""
                )
            )


        application = Application(

            candidate_id=candidate_id,

            job_id=job_id,

            match_score=match_score,

            status="pending"
        )


        db.session.add(
            application
        )

        db.session.commit()


        return jsonify({

            "message":
                "Application submitted successfully!",

            "application_id":
                application.id,

            "match_score":
                match_score

        }), 201


    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# RECRUITER JOBS
# =========================================================

@app.route(
    "/my-jobs/<int:recruiter_id>",
    methods=["GET"]
)
def recruiter_jobs(recruiter_id):

    try:

        jobs = (
            Job.query
            .filter_by(
                recruiter_id=recruiter_id
            )
            .order_by(
                Job.created_at.desc()
            )
            .all()
        )


        result = []


        for job in jobs:

            applications_count = (
                Application.query
                .filter_by(
                    job_id=job.id
                )
                .count()
            )


            result.append({

                "id":
                    job.id,

                "title":
                    job.title,

                "description":
                    job.description,

                "location":
                    job.location,

                "skills":
                    job.skills,

                "applications_count":
                    applications_count,

                "created_at":
                    (
                        job.created_at
                        .strftime("%Y-%m-%d")
                        if job.created_at
                        else None
                    )
            })


        return jsonify(result), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# JOB APPLICATIONS
# =========================================================

@app.route(
    "/job-applications/<int:job_id>",
    methods=["GET"]
)
def job_applications(job_id):

    try:

        applications = (
            Application.query
            .filter_by(
                job_id=job_id
            )
            .all()
        )


        result = []


        for application in applications:

            candidate = db.session.get(
                User,
                application.candidate_id
            )


            if not candidate:
                continue


            result.append({

                "application_id":
                    application.id,

                "candidate_id":
                    candidate.id,

                "candidate_name":
                    candidate.name,

                "candidate_email":
                    candidate.email,

                "match_score":
                    application.match_score,

                "status":
                    application.status,

                "applied_at":
                    (
                        application.applied_at
                        .strftime("%Y-%m-%d")
                        if application.applied_at
                        else None
                    )
            })


        result.sort(
            key=lambda item:
                item["match_score"],
            reverse=True
        )


        return jsonify(result), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# UPDATE APPLICATION
# =========================================================

@app.route(
    "/update-application/<int:application_id>",
    methods=["PUT"]
)
def update_application(application_id):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        status = data.get(
            "status"
        )


        allowed_statuses = [
            "pending",
            "shortlisted",
            "rejected"
        ]


        if status not in allowed_statuses:

            return jsonify({
                "error":
                "Invalid application status"
            }), 400


        application = db.session.get(
            Application,
            application_id
        )


        if not application:

            return jsonify({
                "error":
                "Application not found"
            }), 404


        application.status = status

        db.session.commit()


        return jsonify({

            "message":
                f"Application {status} successfully!",

            "application_id":
                application.id,

            "new_status":
                application.status

        }), 200


    except Exception as e:

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# CANDIDATE APPLICATIONS
# =========================================================

@app.route(
    "/my-applications/<int:candidate_id>",
    methods=["GET"]
)
def candidate_applications(candidate_id):

    try:

        applications = (
            Application.query
            .filter_by(
                candidate_id=candidate_id
            )
            .order_by(
                Application.applied_at.desc()
            )
            .all()
        )


        result = []


        for application in applications:

            job = db.session.get(
                Job,
                application.job_id
            )


            if not job:
                continue


            result.append({

                "application_id":
                    application.id,

                "job_id":
                    job.id,

                "job_title":
                    job.title,

                "job_location":
                    job.location,

                "skills":
                    job.skills,

                "match_score":
                    application.match_score,

                "status":
                    application.status,

                "applied_at":
                    (
                        application.applied_at
                        .strftime("%Y-%m-%d")
                        if application.applied_at
                        else None
                    )
            })


        return jsonify(result), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# SEND NOTIFICATION
# =========================================================

@app.route(
    "/send-notification/<int:application_id>",
    methods=["POST"]
)
def send_notification(application_id):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        notification_type = data.get(
            "type"
        )


        application = db.session.get(
            Application,
            application_id
        )


        if not application:

            return jsonify({
                "error":
                "Application not found"
            }), 404


        candidate = db.session.get(
            User,
            application.candidate_id
        )


        job = db.session.get(
            Job,
            application.job_id
        )


        if not candidate or not job:

            return jsonify({
                "error":
                "Candidate or job not found"
            }), 404


        print(
            f"Notification for "
            f"{candidate.email}: "
            f"{notification_type} "
            f"for {job.title}"
        )


        return jsonify({

            "message":
                "Notification processed",

            "candidate_name":
                candidate.name,

            "job_title":
                job.title,

            "status":
                notification_type

        }), 200


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# LOCAL DEVELOPMENT ONLY
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )