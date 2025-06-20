# Hatchmark - Digital Authenticity Service

![Project Status](https://img.shields.io/badge/status-in_development-blue)
![AWS QLDB](https://img.shields.io/badge/AWS-QLDB-orange?logo=amazonaws)
![AWS Fargate](https://img.shields.io/badge/AWS-Fargate-orange?logo=amazonaws)
![AWS Step Functions](https://img.shields.io/badge/AWS-Step%20Functions-orange?logo=amazonaws)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)

Hatchmark is a platform designed to solve the modern problem of digital trust. It provides a way to prove the origin and authenticity of creative works by creating a precise, immutable "hatch mark" on a verifiable digital ledger.

---

## 🚀 Project Objective

The goal is to build a robust, end-to-end system where a creator can upload their original work to:
1.  **Create an Immutable Record:** Generate a unique digital fingerprint of the file and record it on the **Amazon Quantum Ledger Database (QLDB)**, providing a tamper-proof, cryptographically verifiable timestamp of creation.
2.  **Embed an Invisible Watermark:** Process the file using a containerized application on **AWS Fargate** to embed a robust, invisible watermark containing its authenticity credentials.

This allows anyone to later verify a piece of content against the ledger to confirm its origin and integrity.

---

## 🏛️ Architectural Diagram

*(This is a placeholder for the final architecture diagram.)*

![Architecture Diagram](./architecture/architecture.png)

---

## 🛠️ Technology Stack

* **Orchestration:** AWS Step Functions
* **Serverless Compute:** AWS Lambda
* **Containerized Compute:** AWS Fargate
* **Database:** Amazon QLDB (Immutable Ledger)
* **API & Ingestion:** Amazon API Gateway, Amazon S3, Amazon SQS
* **Language & Frameworks:** Python, Docker

---

## 📂 Project Structure

.
├── backend/          # Serverless components (API handlers, Lambda functions)
├── watermarker/      # Dockerized application for heavy processing
├── architecture/     # Architecture diagrams
└── README.md         # This file


