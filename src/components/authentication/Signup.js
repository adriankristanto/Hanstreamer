import React, { useRef, useState, useEffect } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useHistory } from "react-router-dom";
import CenteredContainer from "../utilities/CenteredContainer";

export default function Signup() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const passwordConfirmRef = useRef();
    const { signup } = useAuth();
    const [error, setError] = useState("");
    // make sure that user can't click on the signup button while the account is in the process of being created
    // if the signup process is currently running, the disabled property of the sign up button will be true
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    // when the signup is successful, user will automatically get redirected to dashboard
    // therefore, this component will be dismounted and setLoading(false) will not get executed
    // the following useeffect will execute setLoading(false) when the component is dismounted
    useEffect(() => {
        return () => setLoading(false);
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();

        if (passwordRef.current.value !== passwordConfirmRef.current.value) {
            return setError("Passwords do not match");
        }

        try {
            setError("");
            setLoading(true);
            await signup(emailRef.current.value, passwordRef.current.value);
            history.push("/");
        } catch {
            setError("Failed to create a new account");
        }
        setLoading(false);
    }

    return (
        <CenteredContainer>
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Sign Up</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group id="email" className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                ref={emailRef}
                                required
                            />
                        </Form.Group>
                        <Form.Group id="password" className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                ref={passwordRef}
                                required
                            />
                        </Form.Group>
                        <Form.Group id="password-confirm" className="mb-3">
                            <Form.Label>Password Confirmation</Form.Label>
                            <Form.Control
                                type="password"
                                ref={passwordConfirmRef}
                                required
                            />
                        </Form.Group>
                        <Button
                            disabled={loading}
                            className="w-100"
                            type="submit"
                        >
                            Sign Up
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                Already have an account? <Link to="/login">Log In</Link>
            </div>
        </CenteredContainer>
    );
}
