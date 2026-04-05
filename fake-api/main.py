"""
Fake API Service
A simple FastAPI application simulating an external API that 429.rs protects.
"""
import time
import random
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="Fake API",
    description="Simulated external API used as an upstream target for the 429.rs rate limiter",
    version="1.0.0",
)


class Product(BaseModel):
    id: int
    name: str
    price: float
    stock: int


class User(BaseModel):
    id: int
    username: str
    email: str


PRODUCTS = [
    Product(id=1, name="Widget A", price=9.99, stock=100),
    Product(id=2, name="Widget B", price=19.99, stock=50),
    Product(id=3, name="Gadget X", price=49.99, stock=25),
    Product(id=4, name="Gadget Y", price=99.99, stock=10),
    Product(id=5, name="Doohickey Z", price=4.99, stock=200),
]

USERS = [
    User(id=1, username="alice", email="alice@example.com"),
    User(id=2, username="bob", email="bob@example.com"),
    User(id=3, username="charlie", email="charlie@example.com"),
]


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "fake-api"}


@app.get("/products", response_model=list[Product])
def list_products():
    """Return a list of available products."""
    # Simulate some processing delay
    time.sleep(random.uniform(0.01, 0.05))
    return PRODUCTS


@app.get("/products/{product_id}", response_model=Product)
def get_product(product_id: int):
    """Return a single product by ID."""
    for product in PRODUCTS:
        if product.id == product_id:
            return product
    raise HTTPException(status_code=404, detail=f"Product {product_id} not found")


@app.get("/users", response_model=list[User])
def list_users():
    """Return a list of users."""
    time.sleep(random.uniform(0.01, 0.05))
    return USERS


@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: int):
    """Return a single user by ID."""
    for user in USERS:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail=f"User {user_id} not found")


@app.get("/slow")
def slow_endpoint():
    """A slow endpoint to demonstrate timeout handling."""
    time.sleep(random.uniform(0.5, 2.0))
    return {"message": "This took a while!", "timestamp": time.time()}
