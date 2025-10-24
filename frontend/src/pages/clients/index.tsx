import React from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, Tab, Container } from "react-bootstrap";

const Index = () => {
  return (
    <React.Fragment>
      <Helmet title="Clientes" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">Operações Clientes</h1>
      </Container>
    </React.Fragment>
  );
};

export default Index;
