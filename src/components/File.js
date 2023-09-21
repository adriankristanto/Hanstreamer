import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Button, Modal, Toast } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { database, storage } from "../firebase";

export default function File({ file, ...props }) {
    const { currentUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    function openModal() {
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    function handleDelete() {
        closeModal();
        setLoading(true);
        const deleteTask = storage.refFromURL(file.url).delete();

        deleteTask.then(() =>
            database.files
                .where("userId", "==", currentUser.uid)
                .where("url", "==", file.url)
                .get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        doc.ref.delete();
                    });
                    setLoading(false);
                })
        );
    }

    return (
        <div {...props}>
            <div className="me-auto p-2">{file.name}</div>
            <Button variant="danger" onClick={openModal}>
                Delete
            </Button>
            <Modal show={open} onHide={closeModal} centered>
                <Modal.Body>
                    Are you sure you want to delete {file.name}?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete
                    </Button>
                    <Button variant="secondary" onClick={closeModal}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
            {loading &&
                ReactDOM.createPortal(
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            margin: "auto",
                            maxWidth: "250px",
                        }}
                    >
                        {<Toast className="p-3 m-3 fs-5">Deleting...</Toast>}
                    </div>,
                    document.body
                )}
        </div>
    );
}
