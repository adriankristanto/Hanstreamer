import React from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// only route to component if user is logged in
// https://stackoverflow.com/questions/57065348/destructuring-and-rename-property
// renaming a property of a destructured object -> component : Component
export default function PrivateRoute({ children, ...rest }) {
    const { currentUser } = useAuth();

    return (
        <Route
            {...rest}
            // for example, if the user goes to /display/xxxx, user will be required to login
            // without location, after login, the user will automatically get redirected to /
            // with location, user will automatically get redirected to the place that they wanted to visit
            // prior to logging in, i.e. /display/xxxx, instead of /
            render={({ location }) => {
                return currentUser ? (
                    children
                ) : (
                    <Redirect
                        to={{
                            pathname: "/login",
                            state: { from: location },
                        }}
                    />
                );
            }}
        ></Route>
    );
}
