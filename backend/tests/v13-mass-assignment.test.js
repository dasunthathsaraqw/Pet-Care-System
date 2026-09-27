import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import AdoptionForm from '../models/adoptionForm.js';
import adoptionFormRoutes from '../routes/adoptionFormRoutes.js';

const applicationId = '507f1f77bcf86cd799439011';
const applicantEmail = 'applicant@example.com';
const originalApplication = {
  _id: applicationId,
  email: applicantEmail,
  firstName: 'Original',
  lastName: 'Applicant',
  phoneNumber: '0771234567',
  petType: 'Dog',
  petName: 'Buddy',
  petImage: '/uploads/buddy.jpg',
  homeType: 'House',
  employmentStatus: 'Employed',
  hasYard: true,
  hasOtherPets: false,
  additionalInfo: 'Original information',
  status: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

test('V13 adoption application update routes', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const originalFindById = AdoptionForm.findById;
  const originalFindByIdAndUpdate = AdoptionForm.findByIdAndUpdate;
  const originalAdminFindById = Admin.findById;
  let application = { ...originalApplication };
  let server;

  process.env.JWT_SECRET = 'v13-local-test-secret';
  AdoptionForm.findById = async (id) => id === applicationId ? { ...application } : null;
  AdoptionForm.findByIdAndUpdate = async (id, update) => {
    if (id !== applicationId) return null;
    Object.assign(application, update.$set);
    return { ...application };
  };
  Admin.findById = (id) => {
    const admin = id === 'manager-id'
      ? { _id: id, role: 'adoption_manager' }
      : id === 'other-admin-id'
        ? { _id: id, role: 'event_manager' }
        : null;
    return {
      select: async () => admin,
      then: (resolve, reject) => Promise.resolve(admin).then(resolve, reject),
    };
  };

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/adoptionform', adoptionFormRoutes);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const applicantToken = jwt.sign({ userId: 'applicant-id', email: applicantEmail }, process.env.JWT_SECRET);
    const otherUserToken = jwt.sign({ userId: 'other-user-id', email: 'other@example.com' }, process.env.JWT_SECRET);
    const managerToken = jwt.sign({ adminId: 'manager-id' }, process.env.JWT_SECRET);
    const otherAdminToken = jwt.sign({ adminId: 'other-admin-id' }, process.env.JWT_SECRET);

    const request = async (method, route, token, body) => {
      const response = await fetch(`${baseUrl}${route}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const put = (token, body) => request('PUT', `/api/adoptionform/update/${applicationId}`, token, body);
    const patch = (token, body) => request('PATCH', `/api/adoptionform/status/${applicationId}`, token, body);
    const reset = () => { application = { ...originalApplication }; };

    await t.test('applicant updates all five editable fields', async () => {
      reset();
      const updates = {
        homeType: 'Apartment',
        employmentStatus: 'Student',
        hasYard: false,
        hasOtherPets: true,
        additionalInfo: 'Updated by applicant',
      };
      const response = await put(applicantToken, updates);
      assert.equal(response.status, 200);
      for (const [field, value] of Object.entries(updates)) {
        assert.equal(application[field], value, field);
      }
      assert.equal(application.status, 'pending');
    });

    await t.test('applicant cannot self-approve while editing additionalInfo', async () => {
      reset();
      const response = await put(applicantToken, { additionalInfo: 'V13 test', status: 'approved' });
      assert.equal(response.status, 200);
      assert.equal(application.additionalInfo, 'V13 test');
      assert.equal(application.status, 'pending');
    });

    await t.test('general PUT ignores every privileged or identity field', async () => {
      reset();
      const protectedValues = {
        status: 'rejected',
        email: 'changed@example.com',
        firstName: 'Changed',
        lastName: 'Changed',
        phoneNumber: '0000000000',
        petType: 'Cat',
        petName: 'Changed',
        petImage: '/uploads/changed.jpg',
        _id: 'changed-id',
        createdAt: '2030-01-01T00:00:00.000Z',
        updatedAt: '2030-01-02T00:00:00.000Z',
      };
      const response = await put(applicantToken, protectedValues);
      assert.equal(response.status, 200);
      for (const field of Object.keys(protectedValues)) {
        assert.equal(application[field], originalApplication[field], field);
      }
    });

    await t.test('existing ownership check still rejects another applicant', async () => {
      reset();
      const response = await put(otherUserToken, { additionalInfo: 'Unauthorized edit' });
      assert.equal(response.status, 403);
      assert.equal(application.additionalInfo, originalApplication.additionalInfo);
    });

    await t.test('adoption manager may edit applicant fields but not status through PUT', async () => {
      reset();
      const response = await put(managerToken, { additionalInfo: 'Manager edit', status: 'approved' });
      assert.equal(response.status, 200);
      assert.equal(application.additionalInfo, 'Manager edit');
      assert.equal(application.status, 'pending');
    });

    await t.test('normal user cannot access the status PATCH route', async () => {
      reset();
      const response = await patch(applicantToken, { status: 'approved' });
      assert.equal(response.status, 403);
      assert.equal(application.status, 'pending');
    });

    await t.test('another admin role cannot access the status PATCH route', async () => {
      reset();
      const response = await patch(otherAdminToken, { status: 'approved' });
      assert.equal(response.status, 403);
      assert.equal(application.status, 'pending');
    });

    await t.test('adoption manager can set every schema status value through PATCH', async () => {
      for (const status of ['pending', 'pending_review', 'approved', 'rejected']) {
        reset();
        const response = await patch(managerToken, { status });
        assert.equal(response.status, 200, status);
        assert.equal(application.status, status);
        assert.equal(response.body.status, status);
      }
    });

    await t.test('invalid status is rejected', async () => {
      reset();
      const response = await patch(managerToken, { status: 'invalid' });
      assert.equal(response.status, 400);
      assert.equal(application.status, 'pending');
    });

    await t.test('status PATCH ignores extra fields under the existing controller behavior', async () => {
      reset();
      const response = await patch(managerToken, { status: 'approved', email: 'changed@example.com' });
      assert.equal(response.status, 200);
      assert.equal(application.status, 'approved');
      assert.equal(application.email, applicantEmail);
    });

    await t.test('coordinator visit, approval, and rejection all use status PATCH', async () => {
      const source = await readFile(new URL('../../frontend/src/Pages/AdoptionCoordinatorDashBoard.jsx', import.meta.url), 'utf8');
      for (const [handler, status] of [
        ['handleMarkAsVisited', 'pending_review'],
        ['handleApproveApplication', 'approved'],
        ['handleRejectApplication', 'rejected'],
      ]) {
        const start = source.indexOf(`const ${handler} = async`);
        assert.notEqual(start, -1, handler);
        const end = source.indexOf('\n  };', start);
        assert.notEqual(end, -1, handler);
        const handlerSource = source.slice(start, end);
        assert.match(handlerSource, new RegExp(`await axios\\.patch\\(\\s*\x60[^\x60]*api/adoptionform/status/[^\x60]*\x60,\\s*\\{\\s*status: '${status}'`), handler);
        assert.doesNotMatch(handlerSource, /api\/adoptionform\/update\//, handler);
      }
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    AdoptionForm.findById = originalFindById;
    AdoptionForm.findByIdAndUpdate = originalFindByIdAndUpdate;
    Admin.findById = originalAdminFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
