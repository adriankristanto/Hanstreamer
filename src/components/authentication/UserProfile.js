import React, { useState } from "react";
import { Alert, Card, Button } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { useHistory } from "react-router";
import CenteredContainer from "../utilities/CenteredContainer";
import NavigationBar from "../NavigationBar";

export default function UserProfile() {
    const [error, setError] = useState("");
    const { currentUser, logout } = useAuth();
    const history = useHistory();

    async function handleLogout() {
        try {
            setError("");
            await logout();
            history.push("/login");
        } catch {
            setError("Failed to log out");
        }
    }

    return (
        <>
            <NavigationBar fixed="top" />
            <CenteredContainer>
                <Card>
                    <Card.Body>
                        <h2 className="text-center mb-4">User Profile</h2>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <strong>Email:</strong> {currentUser?.email}
                    </Card.Body>
                </Card>
                <div className="w-100 text-center mt-2">
                    <Button variant="link" onClick={handleLogout}>
                        Log Out
                    </Button>
                </div>
            </CenteredContainer>
        </>
    );
}
