import React, { useEffect, useState } from "react";
import { Container, Button, Row, Col } from "react-bootstrap";
import NavigationBar from "./NavigationBar";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import CopyToClipboardButton from "./CopyToClipboardButton";
import UploadFileButton from "./UploadFileButton";
import { database, firestore } from "../firebase";
import File from "./File";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [files, setFiles] = useState([]);

    // instead of emptying files everytime the files are updated on the database,
    // only empty it when the component is first created
    useEffect(() => {
        setFiles([]);
    }, []);

    // when the currentUser changes, change the files displayed to the account to ones owned by the currentUser
    useEffect(() => {
        const cleanup = database.files
            .where("userId", "==", currentUser.uid)
            .orderBy("ordering")
            .onSnapshot((snapshot) => {
                setFiles(snapshot.docs.map(database.formatDoc));
            });
        return cleanup;
    }, [currentUser]);

    // whenever the files changes, change the ordering too
    useEffect(() => {
        // for some reason, database.batch doesn't work because it thinks firestore is not configured
        const batch = firestore.batch();
        files
            .map((file, index) => {
                return { ...file, ordering: index };
            })
            .forEach((file) => {
                batch.update(database.files.doc(file.id), {
                    ordering: file.ordering,
                });
            });
        batch.commit();
    }, [currentUser, files]);

    function onDragEnd(result) {
        if (!result.destination) {
            return;
        }

        const items = Array.from(files);
        const [removed] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, removed);

        setFiles(items);
    }

    return (
        <div>
            <NavigationBar />
            <Container className="d-flex flex-column">
                <Row className="p-3 mt-4 bg-light rounded-3">
                    <Col>
                        <Container
                            fluid
                            className="py-1 d-flex align-items-center"
                        >
                            <div className="p-2 flex-grow-1 bd-highlight fs-2">
                                My Display
                            </div>
                            {/* https://stackoverflow.com/questions/11401897/get-the-current-domain-name-with-javascript-not-the-path-etc */}
                            <CopyToClipboardButton
                                className="m-3 p-4 bd-highlight fs-4"
                                textToBeCopied={`${window.location.host}/display`}
                                defaultText={"Copy Display Link"}
                                onSuccessText={"Link Copied!"}
                            />
                            {/* open the display in new browser tab */}
                            <Button className="m-3 p-4 bd-highlight fs-4">
                                <Link
                                    to="/display"
                                    target={"_blank"}
                                    rel={"noopener noreferrer"}
                                    style={{
                                        textDecoration: "none",
                                        color: "white",
                                    }}
                                >
                                    Preview Display
                                </Link>
                            </Button>
                        </Container>
                    </Col>
                </Row>
                <Row className="p-3 mt-4 bg-light rounded-3 h-25">
                    <div>
                        <Col
                            style={{ overflowY: "scroll", maxHeight: "600px" }}
                        >
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="droppable">
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                        >
                                            {files.map((file, index) => (
                                                <Draggable
                                                    key={file.id}
                                                    draggableId={file.id}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={
                                                                provided.innerRef
                                                            }
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                        >
                                                            <Row>
                                                                <File
                                                                    file={file}
                                                                    className="fs-4 m-1 p-2 d-flex align-items-center btn-success"
                                                                />
                                                            </Row>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </Col>
                        <Col>
                            <Row className="justify-content-center sticky-bottom">
                                <UploadFileButton className="mx-3 mt-3 p-4 bd-highlight fs-4" />
                            </Row>
                        </Col>
                    </div>
                </Row>
            </Container>
        </div>
    );
}
