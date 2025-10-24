import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Button } from "react-bootstrap";

const Page500 = () => (
  <React.Fragment>
    <Helmet title="500 Error" />
    <div className="text-center">
      <h1 className="display-1 fw-bold">500</h1>
      <p className="h2">Erro Interno no Servidor!</p>
      <p className="lead fw-normal mt-3 mb-4">
        O servidor encontrou algo inesperado que não permitiu completar a
        solicitação.
      </p>
      <Link to="/">
        <Button variant="primary" size="lg">
          Voltar ao site!
        </Button>
      </Link>
    </div>
  </React.Fragment>
);

export default Page500;
