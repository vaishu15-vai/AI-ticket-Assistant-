import json
import os
import uuid
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")
comprehend = boto3.client("comprehend")
bedrock = boto3.client("bedrock-runtime")
table = dynamodb.Table(os.environ["TICKETS_TABLE"])


def api_response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
        },
        "body": json.dumps(body),
    }


def analyze(text):
    sentiment = comprehend.detect_sentiment(
        Text=text[:5000], LanguageCode="en"
    )["Sentiment"].title()
    prompt = (
        "Analyze this support ticket and return only valid JSON with keys "
        "category, priority, summary, reply. Use priority Urgent, High, "
        "Medium, or Low. Keep summary under 35 words.\n\nTicket: " + text
    )
    model_id = os.environ.get(
        "BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"
    )
    result = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "messages": [{"role": "user", "content": prompt}],
            }
        ),
    )
    content = json.loads(result["body"].read())["content"][0]["text"]
    parsed = json.loads(content[content.find("{") : content.rfind("}") + 1])
    parsed["sentiment"] = sentiment
    return parsed


def handler(event, context):
    method = event.get("requestContext", {}).get(
        "http", {}
    ).get("method", event.get("httpMethod", "GET"))
    if method == "GET":
        return api_response(200, table.scan(Limit=100).get("Items", []))
    if method != "POST":
        return api_response(405, {"error": "Method not allowed"})
    try:
        payload = json.loads(event.get("body") or "{}")
        text = payload.get("message", "").strip()
        if not text:
            return api_response(400, {"error": "message is required"})
        analysis = analyze(text)
        ticket = {
            "id": f"TKT-{uuid.uuid4().hex[:6].upper()}",
            "message": text,
            "customer": payload.get("customer", "New customer"),
            "email": payload.get("email", ""),
            "status": "Open",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            **analysis,
        }
        table.put_item(Item=ticket)
        return api_response(201, ticket)
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        return api_response(400, {"error": str(exc)})
