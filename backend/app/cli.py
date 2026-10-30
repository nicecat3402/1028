import argparse
import getpass
from sqlalchemy import select
from .config import Settings
from .db import database
from .models import User
from .main import passwords
from .schemas import NewUser


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['create-admin'])
    parser.add_argument('--username', required=True)
    args = parser.parse_args()
    password = getpass.getpass('New administrator password (12+ characters): ')
    if password != getpass.getpass('Confirm password: '):
        raise SystemExit('Passwords do not match')
    body = NewUser(username=args.username, password=password, role='admin')
    _, factory = database(Settings())
    with factory.begin() as db:
        if db.scalar(select(User).where(User.username == body.username.strip().lower())):
            raise SystemExit('Username already exists; refusing to overwrite')
        db.add(User(username=body.username.strip().lower(), password_hash=passwords.hash(body.password), role='admin'))
    print('Administrator created; no password was stored in a command argument or log.')


if __name__ == '__main__':
    main()
