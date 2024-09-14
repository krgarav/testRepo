import {
  Card,
  CardHeader,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Table,
  Container,
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import NormalHeader from "components/Headers/NormalHeader";
import { Modal, Button, Row, Col, Spinner } from "react-bootstrap";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "store/DataContext";
import axios from "axios";
import TemplateModal from "../ui/TemplateModal";
import { fetchAllTemplate } from "helper/TemplateHelper";
import { deleteTemplate } from "helper/TemplateHelper";
import CryptoJS from "crypto-js";
import { toast } from "react-toastify";
import { getTemplateImage } from "helper/TemplateHelper";
import { getTemplateCsv } from "helper/TemplateHelper";
import { getLayoutDataById } from "helper/TemplateHelper";
import Papa from "papaparse";
import { checkJobStatus } from "helper/TemplateHelper";
import Placeholder from "ui/Placeholder";
import CloneTemplateHandler from "services/CloneTemplate";
import BookletModal from "ui/BookletModal";
const base64ToFile = (base64, filename) => {
  const byteString = atob(base64.split(",")[1]);
  const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  return new File([blob], filename, { type: mimeString });
};
const Template = () => {
  const [modalShow, setModalShow] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [templateDatail, setTemplateDetail] = useState([]);
  const [toggle, setToggle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const navigate = useNavigate();
  const dataCtx = useContext(DataContext);
  useEffect(() => {
    sessionStorage.clear();
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      setTemplateLoading(true);
      const templates = await fetchAllTemplate();
      console.log(templates);
      if (templates === undefined) {
        toast.error("Error fetching templates");
        setTemplateLoading(false);
      }
      const mpObj = templates?.map((item) => {
        return [{ layoutParameters: item }];
      });
      dataCtx.addToAllTemplate(mpObj);
      setTemplateLoading(false);
    };
    fetchData();
  }, [toggle]);

  const duplicateHandler = (arr) => {
    setShowDetailModal(true);
    console.log(arr);
    setTemplateDetail(arr);
  };
  const cloneHandler = async (arr) => {
    // setShowDetailModal(false);
    console.log(templateDatail[0].layoutParameters.id);
    const temp = await CloneTemplateHandler(
      templateDatail[0].layoutParameters.id
    );

    if (temp === "Template Cloned Successfully") {
      toast.success(temp);
    } else {
      toast.error(temp);
    }
    setToggle((tg) => !tg);
    setShowDetailModal(false);
  };
  const handleRowClick = (rowData, index) => {};
  const editHandler = async (arr, index) => {
    setLoading(true);
    const tempdata = arr[0].layoutParameters;
    const templateId = tempdata.id;
    const res = await getLayoutDataById(templateId);
    const templateFile = res.templateFiles.slice(-3);

    if (templateFile.length < 3) {
      alert("No images found in this template.Cannot Open the template.");
      setLoading(false);
      return;
    }
    const csvpath = res?.templateFiles[2].excelPath;
    const frontImgpath = res?.templateFiles[0].imagePath;
    const backImgpath = res?.templateFiles[1].imagePath;
    const res1 = await getTemplateImage(frontImgpath);
    const res3 = await getTemplateImage(backImgpath);

    if (res3 === undefined) {
      alert("No back image found in this template.Cannot Open the template. ");
      setLoading(false);
      return;
    }
    if (res1 === undefined) {
      alert("No front image found in this template.Cannot Open the template. ");
      setLoading(false);
      return;
    }

    const imgfile = base64ToFile(res1.image, "front.jpg");

    const res2 = await getTemplateCsv(csvpath);
    if (res2 === undefined) {
      alert("No CSV found in this template.Cannot Open the template. ");
      setLoading(false);
      return;
    }

    const csvContent = Papa.unparse(res2.data);
    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create a File from the Blob
    const csvfile = new File([blob], "data.csv", { type: "text/csv" });
    setLoading(false);

    navigate("/admin/template/edit-template", {
      state: {
        templateIndex: index,
        timingMarks: +tempdata.timingMarks,
        totalColumns: +tempdata.totalColumns,
        templateImagePath: res1,
        templateBackImagePath: res3,
        bubbleType: tempdata.bubbleType,
        templateId: tempdata.id,
        excelJsonFile: res2.data,
      },
    });
    setLoading(false);
  };

  const deleteImage = async (imageUrl) => {
    const cloudName = process.env.REACT_APP_CLOUD_NAME; // Your Cloudinary cloud name
    const apiKey = process.env.REACT_APP_API_KEY; // Your Cloudinary API key
    const apiSecret = process.env.REACT_APP_API_SECRET; // Your Cloudinary API secret

    // Extract public ID from URL
    const urlParts = imageUrl.split("/");
    const versionIndex = urlParts.findIndex((part) => part.startsWith("v"));
    const publicIdWithFormat = urlParts.slice(versionIndex + 1).join("/"); // omrimages/dj7va6r3farwpblq6txv.jpg
    const publicId = publicIdWithFormat.split(".")[0]; // omrimages/dj7va6r3farwpblq6txv

    console.log("Extracted public ID:", publicId); // Debugging: Log the public ID

    // Create the timestamp and signature
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = CryptoJS.SHA1(stringToSign).toString();

    // Form data for the request
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp);
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    try {
      // Make the API request to delete the image
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(response.data); // Debugging: Log the response data

      return response.data;
    } catch (error) {
      console.error("Error deleting image:", error); // Debugging: Log any error
      throw error;
    }
  };

  const deleteHandler = async (arr, index) => {
    const result = window.confirm("Are you sure you want to delete template ?");
    if (result) {
      const id = arr[0].layoutParameters.id;
      // const imageUrl = arr[0].layoutParameters.templateImagePath;
      // const result = await deleteImage(imageUrl);
      const responseJob = await checkJobStatus(id);
      console.log(responseJob);
      // return;
      if (responseJob.success) {
        const result = window.confirm(
          "Job already created by this template.Do you still want to delete Template?"
        );
        if (!result) {
          return;
        }
      }

      const res = await deleteTemplate(id);
      if (res?.success) {
        setToggle((prev) => !prev);
        toast.success("Successfully deleted template");
      }

      // dataCtx.deleteTemplate(index)
    } else {
      return;
    }
  };
  const placeHolderJobs = new Array(10).fill(null).map((_, index) => (
    <tr key={index}>
      <td>
        <Placeholder width="20%" height="1.5em" />
      </td>
      <td>
        <Placeholder width="60%" height="1.5em" />
      </td>
      <td>
        <Placeholder width="60%" height="1.5em" />
      </td>
      <td>
        <Placeholder width="60%" height="1.5em" />
      </td>
      <td>
        <Placeholder width="60%" height="1.5em" />
      </td>
      <td></td>
    </tr>
  ));
  const LoadedTemplates = dataCtx.allTemplates?.map((d, i) => (
    <tr
      key={i}
      onClick={() => handleRowClick(d, i)}
      style={{ cursor: "pointer" }} // Adds a pointer cursor on hover
    >
      <td>{i + 1}</td>
      <td>{d[0].layoutParameters.layoutName}</td>
      <td>{d[0].layoutParameters.timingMarks}</td>
      <td>{d[0].layoutParameters.totalColumns}</td>
      <td>{d[0].layoutParameters["bubbleType"]}</td>
      <td className="text-right">
        <UncontrolledDropdown>
          <DropdownToggle
            className="btn-icon-only text-light"
            href="#pablo"
            role="button"
            size="sm"
            color=""
            onClick={(e) => e.preventDefault()}
          >
            <i className="fas fa-ellipsis-v" />
          </DropdownToggle>
          <DropdownMenu className="dropdown-menu-arrow" right>
            <DropdownItem onClick={() => editHandler(d, i)}>Edit</DropdownItem>
            <DropdownItem onClick={() => duplicateHandler(d)}>
              Duplicate
            </DropdownItem>
            <DropdownItem
              style={{ color: "red" }}
              onClick={() => deleteHandler(d, i)}
            >
              Delete
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      </td>
    </tr>
  ));

  return (
    <>
      <NormalHeader />
      {/* Page content */}
      <Container className="mt--7" fluid>
        {/* Table */}
        <Row>
          <div className="col">
            <Card className="shadow">
              <CardHeader className="border-0">
                <div className="d-flex justify-content-between">
                  <h3 className="mt-2">All Templates</h3>

                  <Button
                    className=""
                    color="primary"
                    type="button"
                    onClick={() => setModalShow(true)}
                  >
                    Create Template
                  </Button>
                </div>
              </CardHeader>

              <div style={{ height: "70vh", overflow: "auto" }}>
                {loading && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(0, 0, 0, 0.2)", // Slightly opaque background
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 999,
                      pointerEvents: "auto", // Make the overlay not clickable
                    }}
                  >
                    <Spinner />
                  </div>
                )}

                <Table
                  className="align-items-center table-flush mb-5 table-hover"
                  responsive
                >
                  <thead className="thead-light">
                    <tr>
                      <th scope="col">SL no.</th>
                      <th scope="col">Template Name</th>
                      <th scope="col">Row</th>
                      <th scope="col">Col</th>
                      <th scope="col">Bubble Type</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateLoading ? placeHolderJobs : LoadedTemplates}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>
        </Row>
      </Container>
      {/* Template Detail Modal*/}
      {templateDatail.length !== 0 && (
        <Modal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          size="lg"
          aria-labelledby="modal-custom-navbar"
          centered
        >
          <Modal.Header>
            <Modal.Title id="modal-custom-navbar">
              Template Name : {templateDatail[0].layoutParameters.layoutName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="mb-3">
              <Col xs={12} md={2}>
                <label
                  htmlFor="example-text-input"
                  style={{ fontSize: ".9rem" }}
                >
                  Name:
                </label>
              </Col>
              <Col xs={12} md={10}>
                <input
                  type="text"
                  className="form-control"
                  value={templateDatail[0].layoutParameters.layoutName}
                />
              </Col>
            </Row>
            <Row className="mb-3">
              <Col xs={12} md={2}>
                <label
                  htmlFor="example-text-input"
                  style={{ fontSize: ".9rem" }}
                >
                  Total Row:
                </label>
              </Col>
              <Col xs={12} md={2}>
                <input
                  type="text"
                  className="form-control"
                  value={templateDatail[0].layoutParameters.timingMarks}
                  readOnly
                />
              </Col>
              <Col xs={12} md={2}>
                <label
                  htmlFor="example-text-input"
                  style={{ fontSize: ".9rem" }}
                >
                  Total Column:
                </label>
              </Col>
              <Col xs={12} md={2}>
                <input
                  type="text"
                  className="form-control"
                  value={templateDatail[0].layoutParameters.totalColumns}
                  readOnly
                />
              </Col>
              <Col xs={12} md={2}>
                <label
                  htmlFor="example-text-input"
                  style={{ fontSize: ".9rem" }}
                >
                  Bubble Type:
                </label>
              </Col>
              <Col xs={12} md={2}>
                <input
                  type="text"
                  className="form-control"
                  value={templateDatail[0].layoutParameters.bubbleType}
                  readOnly
                />
              </Col>
            </Row>

            {templateDatail.Regions &&
              templateDatail.Regions.map((item, index) => {
                return (
                  <div key={index}>
                    <Row className="mb-3">
                      <Col xs={12} md={2}>
                        <label
                          htmlFor="example-text-input"
                          style={{ fontSize: ".9rem" }}
                        >
                          Region Name:
                        </label>
                      </Col>
                      <Col xs={12} md={10}>
                        <input
                          type="text"
                          className="form-control"
                          value={item["Region name"]}
                          readOnly
                        />
                      </Col>
                    </Row>

                    <Row className="mb-3">
                      <Col xs={6} md={3}>
                        <label
                          htmlFor="example-text-input"
                          style={{ fontSize: ".9rem" }}
                        >
                          Start Row:
                        </label>
                        <input
                          className="form-control"
                          value={item["Coordinate"]["Start Row"]}
                          readOnly
                        />
                      </Col>
                      <Col xs={6} md={3}>
                        <label
                          htmlFor="example-text-input"
                          style={{ fontSize: ".9rem" }}
                        >
                          Start Col:
                        </label>
                        <input
                          className="form-control"
                          value={item["Coordinate"]["Start Col"]}
                          readOnly
                        />
                      </Col>
                      <Col xs={6} md={3}>
                        <label
                          htmlFor="example-text-input"
                          style={{ fontSize: ".9rem" }}
                        >
                          End Row:
                        </label>
                        <input
                          className="form-control"
                          value={item["Coordinate"]["End Row"]}
                          readOnly
                        />
                      </Col>
                      <Col xs={6} md={3}>
                        <label
                          htmlFor="example-text-input"
                          style={{ fontSize: ".9rem" }}
                        >
                          End Col:
                        </label>
                        <input
                          className="form-control"
                          value={item["Coordinate"]["End Col"]}
                          readOnly
                        />
                      </Col>
                    </Row>
                  </div>
                );
              })}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDetailModal(false)}
            >
              Close
            </Button>
            <Button variant="success" onClick={cloneHandler}>
              Clone Template
            </Button>
          </Modal.Footer>
        </Modal>
      )}
      {/* <TemplateModal show={modalShow} onHide={() => setModalShow(false)} />{" "} */}
      {/* Create Template modal */}
      <BookletModal show={modalShow} onHide={() => setModalShow(false)} />
    </>
  );
};

export default Template;
