# Terraform Backend - Configuration
version: '1.0'
name: Terraform Backend
enabled: true

settings:
  environment: production
  logging: true
  monitoring: true

config:
  timeout: 300
  retries: 3
  cache: true
