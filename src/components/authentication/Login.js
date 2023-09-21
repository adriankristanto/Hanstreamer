import React, { useRef, useState, useEffect } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { Link, useHistory } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import CenteredContainer from "../utilities/CenteredContainer";
import { useLocation } from "react-router";

export default function Login() {
    const emailRef = useRef();
    const passwordRef = useRef();
    const { login } = useAuth();
    const [error, setError] = useState("");
    // make sure that user can't click on the signup button while the account is in the process of being created
    // if the signup process is currently running, the disabled property of the sign up button will be true
    const [loading, setLoading] = useState(false);
    const history = useHistory();
    const { state } = useLocation();

    // when the signup is successful, user will automatically get redirected to dashboard
    // therefore, this component will be dismounted and setLoading(false) will not get executed
    // the following useeffect will execute setLoading(false) when the component is dismounted
    useEffect(() => {
        return () => setLoading(false);
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setError("");
            setLoading(true);
            await login(emailRef.current.value, passwordRef.current.value);
            // redirect to previous place that the user wanted to visit or dashboard once the login is successful
            history.push(state?.from || "/");
        } catch {
            setError("Failed to log in");
        }
        setLoading(false);
    }

    return (
        <CenteredContainer>
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Log In</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group id="email" className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                ref={emailRef}
                                required
                                defaultValue="name@example.com"
                            />
                        </Form.Group>
                        <Form.Group id="password" className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                ref={passwordRef}
                                required
                                defaultValue="password"
                            />
                        </Form.Group>
                        <Button
                            disabled={loading}
                            className="w-100"
                            type="submit"
                        >
                            Log In
                        </Button>
                    </Form>
                    <div className="w-100 text-center mt-3">
                        <Link to="/forgot-password">Forgot Password?</Link>
                    </div>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                Need an account? <Link to="/signup">Sign Up</Link>
            </div>
        </CenteredContainer>
    );
}
