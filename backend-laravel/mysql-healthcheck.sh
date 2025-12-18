#!/bin/bash
# MySQL healthcheck script
mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent
