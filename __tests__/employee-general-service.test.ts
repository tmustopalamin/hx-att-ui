import {
  deleteEmployeeEmergencyContact,
  deleteEmployeeFamily,
  updateEmployeeEmergencyContact,
  updateEmployeeFamily,
} from "@/app/services/employee-general-service";

const successfulResponse = {
  ok: true,
  json: async () => ({ success: true }),
} as Response;

describe("employee detail service endpoints", () => {
  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(successfulResponse);
    global.fetch = fetchMock;
  });

  it("updates family through the item endpoint with optimistic locking", async () => {
    await updateEmployeeFamily(10, 20, 3, {
      name: "Jane",
      relationship_id: 1,
      dob: "1990-01-01",
      marital_status: "MARRIED",
      gender_id: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/employees/10/family-data/20",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ "If-Match": "3" }),
      }),
    );
  });

  it("deletes family through the item endpoint with optimistic locking", async () => {
    await deleteEmployeeFamily(10, 20, 4);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/employees/10/family-data/20",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "If-Match": "4" }),
      }),
    );
  });

  it("updates and deletes emergency contacts through item endpoints", async () => {
    await updateEmployeeEmergencyContact(10, 30, 5, {
      name: "John",
      relationship_id: 2,
      phone: "08123456789",
    });
    await deleteEmployeeEmergencyContact(10, 30, 6);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/employees/10/emergency-contact-data/30",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ "If-Match": "5" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/employees/10/emergency-contact-data/30",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "If-Match": "6" }),
      }),
    );
  });
});
